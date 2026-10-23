import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest
import zlib

import setup_reference_board as board

BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')
SCRIPT = Path(__file__).with_name('setup_reference_board.py')


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


def write_png(path, width, height, pixel=None, depth=8, color=6, extra=b''):
    """Write a small PNG; pixel(x, y) returns channel bytes with a top-left origin."""
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    pixel = pixel or (lambda x, y: bytes(channels))
    rows = b''.join(b'\0' + b''.join(pixel(x, y) for x in range(width)) for y in range(height))
    ihdr = struct.pack('>IIBBBBB', width, height, depth, color, 0, 0, 0)
    Path(path).write_bytes(board.PNG_SIGNATURE + chunk(b'IHDR', ihdr) + extra + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b''))


def tiff_exif(orientation=None, order='<', prefix=b''):
    """Minimal TIFF-structured EXIF with resolution tags and an optional Orientation."""
    entries = [(0x011A, 5, 1, 0), (0x011B, 5, 1, 0)] + ([(0x0112, 3, 1, orientation)] if orientation else [])
    entries.sort()
    body = (b'II' if order == '<' else b'MM') + struct.pack(order + 'HI', 42, 8) + struct.pack(order + 'H', len(entries))
    for tag, kind, count, value in entries:
        packed = struct.pack(order + 'H', value) + b'\0\0' if kind == 3 else struct.pack(order + 'I', value)
        body += struct.pack(order + 'HHI', tag, kind, count) + packed
    return prefix + body + struct.pack(order + 'I', 0)


def pattern(x, y):
    # Distinct, position-encoding RGBA so any crop offset or flip is detectable.
    return bytes((x % 256, y % 256, (x // 256) * 16 + y // 256, 255 - (x + y) % 200))


def rotate(euler, vector):
    """Blender XYZ Euler: R = Rz @ Ry @ Rx."""
    x, y, z = vector
    a, b, c = euler
    y, z = y * math.cos(a) - z * math.sin(a), y * math.sin(a) + z * math.cos(a)
    x, z = x * math.cos(b) + z * math.sin(b), -x * math.sin(b) + z * math.cos(b)
    x, y = x * math.cos(c) - y * math.sin(c), x * math.sin(c) + y * math.cos(c)
    return tuple(round(v, 9) + 0.0 for v in (x, y, z))


class ReferenceBoardValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='bas-board-')
        self.root = Path(self.temp.name)
        write_png(self.root / 'sheet.png', 64, 32)
        self.view = dict(name='Ref_Front', cameraName='RefCam_Front', view='front', image='sheet.png',
                         crop=[0, 0, 20, 32], center=[0, 0, 0.9], verticalSpan=1.8)

    def tearDown(self):
        self.temp.cleanup()

    def manifest(self, *views, **top):
        return dict(schema=board.SCHEMA, collection='Reference Board', views=list(views or [self.view]), **top)

    def rejects(self, data, message):
        with self.assertRaisesRegex(ValueError, message):
            board.validate_manifest(data, self.root)

    def test_valid_manifest_is_normalized(self):
        result = board.validate_manifest(self.manifest(), self.root)
        view = result['views'][0]
        self.assertEqual((result['opacity'], view['imageSize'], view['crop']), (0.35, (64, 32), (0, 0, 20, 32)))
        self.assertEqual(view['image'], (self.root / 'sheet.png').resolve())
        uncropped = dict(self.view)
        del uncropped['crop']
        self.assertEqual(board.validate_manifest(self.manifest(uncropped), self.root)['views'][0]['crop'], (0, 0, 64, 32))
        smallest = board.validate_manifest(self.manifest(dict(self.view, verticalSpan=0.001), opacity=0.05), self.root)
        self.assertEqual((smallest['opacity'], smallest['views'][0]['verticalSpan']), (0.05, 0.001))

    def test_rejects_schema_names_and_counts(self):
        self.rejects(dict(self.manifest(), extra=1), 'no other keys')
        self.rejects(dict(self.manifest(), schema='other'), 'schema')
        self.rejects(self.manifest(dict(self.view, guessed=True)), 'no other keys')
        self.rejects(self.manifest(*[dict(self.view, name=f'R{i}', cameraName=f'C{i}') for i in range(9)]), '1..8')
        self.rejects(self.manifest(self.view, dict(self.view, cameraName='Other')), 'more than once')
        self.rejects(self.manifest(dict(self.view, cameraName='Ref_Front')), 'more than once')
        self.rejects(self.manifest(dict(self.view, name=' padded')), 'whitespace')
        self.rejects(self.manifest(dict(self.view, name='x' * 64)), '63')
        self.rejects(self.manifest(dict(self.view, view='top')), 'view must be one of')
        self.rejects(self.manifest(dict(self.view, view='profile')), 'view must be one of')
        for opacity in (0, 0.01, 1.5):
            self.rejects(self.manifest(opacity=opacity), 'opacity')

    def test_rejects_nonfinite_or_nonpositive_geometry(self):
        for bad in ([0, 0], [0, 0, math.nan], [0, True, 0], [0, 0, 1e7]):
            self.rejects(self.manifest(dict(self.view, center=bad)), 'center')
        for bad in (0, 1e-6, 0.0009, -1, 1e5, math.inf, '1.8', True):
            self.rejects(self.manifest(dict(self.view, verticalSpan=bad)), 'verticalSpan')
        path = self.root / 'nan.json'
        path.write_text('{"schema": "%s", "views": [{"verticalSpan": NaN}]}' % board.SCHEMA)
        with self.assertRaisesRegex(ValueError, 'non-finite'):
            board.load_manifest(path)

    def test_rejects_crops_outside_or_empty(self):
        for crop in ([0, 0, 65, 32], [-1, 0, 20, 32], [20, 0, 20, 32], [0, 32, 20, 0], [0, 0, 20.0, 32],
                     [0, 0, True, 32], [0, 0, 20], [0, 0, 15, 32], [0, 0, 64, 15]):
            self.rejects(self.manifest(dict(self.view, crop=crop)), 'crop')

    def test_rejects_images_that_cannot_round_trip_exactly(self):
        self.rejects(self.manifest(dict(self.view, image='missing.png')), 'existing .png')
        (self.root / 'fake.png').write_bytes(b'not a png')
        self.rejects(self.manifest(dict(self.view, image='fake.png')), 'not a PNG')
        bare = dict(self.view)
        del bare['crop']
        write_png(self.root / 'deep.png', 2, 2, lambda x, y: bytes(8), depth=16)
        self.rejects(self.manifest(dict(bare, image='deep.png')), '8-bit')
        for name, exif, problem in (
            ('rotated.png', tiff_exif(6), 'Orientation 6'),
            ('mirrored.png', tiff_exif(2, '>'), 'Orientation 2'),
            ('malformed.png', b'MM\0*', 'cannot verify EXIF'),
            ('bad-offset.png', b'II*\0' + struct.pack('<I', 4096), 'cannot verify EXIF'),
        ):
            write_png(self.root / name, 16, 16, extra=chunk(b'eXIf', exif))
            self.rejects(self.manifest(dict(bare, image=name)), problem)
        # Resolution-only EXIF, explicit Orientation 1 and an APP1-style prefix are upright.
        for name, exif in (('dpi.png', tiff_exif()), ('upright.png', tiff_exif(1, '>')),
                           ('prefixed.png', tiff_exif(1, prefix=b'Exif\0\0'))):
            write_png(self.root / name, 16, 16, extra=chunk(b'eXIf', exif))
            normalized = board.validate_manifest(self.manifest(dict(bare, image=name)), self.root)
            self.assertEqual(normalized['views'][0]['imageSize'], (16, 16))
        self.assertIsNone(board.exif_orientation(tiff_exif()))
        self.assertEqual(board.exif_orientation(tiff_exif(8, '>')), 8)
        huge = board.PNG_SIGNATURE + chunk(b'IHDR', struct.pack('>IIBBBBB', 5000, 5000, 8, 6, 0, 0, 0))
        (self.root / 'huge.png').write_bytes(huge)
        self.rejects(self.manifest(dict(self.view, image='huge.png')), 'pixels')
        (self.root / 'cut.png').write_bytes((self.root / 'sheet.png').read_bytes()[:-12])
        self.rejects(self.manifest(dict(self.view, image='cut.png')), 'truncated')
        (self.root / 'sheet.jpg').write_bytes(b'\xff\xd8')
        self.rejects(self.manifest(dict(self.view, image='sheet.jpg')), 'existing .png')

    def test_paths_never_overwrite_input_output_or_evidence(self):
        source = self.root / 'in.blend'
        source.write_bytes(b'BLENDER')
        output = self.root / 'out.blend'
        self.assertEqual(board.validate_paths(source, output)[2], (self.root / 'out_reference_board').resolve())
        with self.assertRaisesRegex(ValueError, 'different'):
            board.validate_paths(source, source)
        output.write_bytes(b'')
        with self.assertRaisesRegex(ValueError, 'new file'):
            board.validate_paths(source, output)
        (self.root / 'evidence').mkdir()
        with self.assertRaisesRegex(ValueError, 'evidence directory'):
            board.validate_paths(source, self.root / 'other.blend', self.root / 'evidence')
        with self.assertRaisesRegex(ValueError, 'input'):
            board.validate_paths(self.root / 'absent.blend', self.root / 'other.blend')


class ReferenceBoardGeometryTests(unittest.TestCase):
    def test_camera_and_image_basis_follow_blender_numpad_views(self):
        for name, basis in board.VIEWS.items():
            self.assertEqual(rotate(basis['euler'], (0, 0, -1)), basis['forward'], name)
            self.assertEqual(rotate(basis['euler'], (1, 0, 0)), basis['right'], name)
            self.assertEqual(rotate(basis['euler'], (0, 1, 0)), (0, 0, 1), name)
        # A subject facing -Y appears facing image left only from the +X (right) camera.
        self.assertEqual(board.VIEWS['right']['right'], (0, 1, 0))
        self.assertEqual(board.VIEWS['left']['right'], (0, -1, 0))

    def test_guides_have_physical_size_and_cameras_stay_outside_scene(self):
        view = dict(view='right', crop=(410, 0, 740, 920), center=(0.0, 0.0, 0.9), verticalSpan=1.84)
        plan = board.plan_view(view, scene_radius=1.2)
        self.assertAlmostEqual(plan['physicalSize'][0], 1.84 * 330 / 920)
        self.assertEqual((plan['physicalSize'][1], plan['displaySize'], plan['orthoScale']), (1.84, 1.84, 1.84))
        self.assertEqual(plan['cameraLocation'], (1.2 + 1.84, 0.0, 0.9))
        self.assertGreater(plan['clipEnd'], 1.2 + 1.84 + 1.2)
        wide = board.plan_view(dict(view, crop=(0, 0, 400, 100), verticalSpan=1.0), 0)
        self.assertEqual((wide['physicalSize'], wide['displaySize']), ((4.0, 1.0), 4.0))


@unittest.skipUnless(BLENDER, 'Set BLENDER_EXECUTABLE for reference-board integration tests')
class ReferenceBoardBlenderTests(unittest.TestCase):
    def run_blender(self, *args, timeout=120):
        return subprocess.run([BLENDER, '--background', '--factory-startup', '--disable-autoexec', '--threads', '2',
                               '--python-exit-code', '1', *args], capture_output=True, text=True, timeout=timeout)

    def test_creates_guides_without_touching_sources_or_scene_settings(self):
        with tempfile.TemporaryDirectory(prefix='bas-board-live-') as temp:
            root = Path(temp)
            write_png(root / 'sheet.png', 1536, 1024, pattern)
            write_png(root / 'rgb.png', 24, 16, lambda x, y: bytes((x * 10, y * 15, 7)), color=2)
            source = root / 'model.blend'
            setup = root / 'setup.py'
            setup.write_text(f'''import bpy
for obj in list(bpy.data.objects): bpy.data.objects.remove(obj)
s = bpy.context.scene
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.9))
cam = bpy.data.objects.new("Hero", bpy.data.cameras.new("Hero"))
s.collection.objects.link(cam)
s.camera = cam
s.render.resolution_x, s.render.resolution_y = 640, 360
bpy.ops.wm.save_as_mainfile(filepath={str(source)!r})
''')
            self.assertEqual(self.run_blender('--python', str(setup)).returncode, 0)
            sources = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (source, root / 'sheet.png', root / 'rgb.png')}
            views = [
                dict(name='Ref_Front', cameraName='RefCam_Front', view='front', crop=[0, 0, 440, 920]),
                dict(name='Ref_Profile', cameraName='RefCam_Right', view='right', crop=[410, 0, 740, 920]),
                dict(name='Ref_Back', cameraName='RefCam_Back', view='back', crop=[735, 0, 1135, 920]),
            ]
            for view in views:
                view.update(image='sheet.png', center=[0, 0, 0.92], verticalSpan=1.84)
            views.append(dict(name='Ref_Left', cameraName='RefCam_Left', view='left', image='rgb.png',
                              center=[0, 0, 0.5], verticalSpan=1.0))
            manifest = root / 'board.json'
            manifest.write_text(json.dumps(dict(schema=board.SCHEMA, collection='Reference Board', opacity=0.4, views=views)))
            output = root / 'model_refs.blend'
            invoke = lambda out, m=manifest: self.run_blender('--python', str(SCRIPT), '--', '--input', str(source),
                                                              '--manifest', str(m), '--output', str(out))
            result = invoke(output)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            evidence = root / 'model_refs_reference_board'
            report = json.loads((evidence / 'reference-board.json').read_text())
            self.assertEqual(report['status'], 'created')
            self.assertEqual(report['sceneSettingsPreserved']['camera'], 'Hero')
            self.assertEqual([v['guideImage']['size'] for v in report['views']], [[440, 920], [330, 920], [400, 920], [24, 16]])
            self.assertTrue(all(v['guideImage']['pixelExact'] and v['guideImage']['packed'] for v in report['views']))
            self.assertTrue(all(v['guideImage']['packedSha256'] == v['guideImage']['sha256'] for v in report['views']))
            self.assertTrue(all(Path(v['guideImage']['storedPath']).name == Path(v['guideImage']['path']).name for v in report['views']))
            for path, digest in sources.items():
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), digest, path)

            check = root / 'check.py'
            check.write_text(f'''import bpy, hashlib, json, numpy as np
s = bpy.context.scene
out = dict(camera=s.camera.name, resolution=[s.render.resolution_x, s.render.resolution_y], objects={{}})
for name in ("Ref_Front", "Ref_Profile", "Ref_Back", "Ref_Left", "RefCam_Front", "RefCam_Right", "RefCam_Back", "RefCam_Left"):
    o = bpy.data.objects[name]
    row = dict(location=list(o.location), rotation=list(o.rotation_euler), hide_render=o.hide_render,
               collection=o.users_collection[0].name)
    if o.type == "EMPTY":
        img = o.data
        px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        row.update(size=o.empty_display_size, alpha=o.color[3], depth=o.empty_image_depth, side=o.empty_image_side,
                   image=bpy.path.abspath(img.filepath), pixels_size=list(img.size),
                   packed_sha=hashlib.sha256(bytes(img.packed_file.data)).hexdigest() if img.packed_file else None,
                   bottom_left=[round(v * 255) for v in px[:4]],
                   top_right=[round(v * 255) for v in px[-4:]])
    else:
        row.update(type=o.data.type, ortho=o.data.ortho_scale, fit=o.data.sensor_fit)
    out["objects"][name] = row
print("CHECK " + json.dumps(out))
''')
            # Reopen a moved copy while the crop files are unavailable: guide pixels must come from the .blend.
            moved = root / 'moved'
            moved.mkdir()
            shutil.copy2(output, moved / output.name)
            away = root / 'evidence-away'
            evidence.rename(away)
            try:
                checked = self.run_blender(str(moved / output.name), '--python', str(check))
            finally:
                away.rename(evidence)
            self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
            data = json.loads(next(l for l in checked.stdout.splitlines() if l.startswith('CHECK '))[6:])
            self.assertEqual((data['camera'], data['resolution']), ('Hero', [640, 360]))
            objects = data['objects']
            profile = objects['Ref_Profile']
            self.assertAlmostEqual(profile['size'], 1.84)
            hashes = {v['name']: v['guideImage']['sha256'] for v in report['views']}
            self.assertEqual({n: objects[n]['packed_sha'] for n in hashes}, hashes)
            self.assertAlmostEqual(objects['Ref_Left']['size'], 1.5)
            self.assertEqual((profile['alpha'] > 0.399, profile['depth'], profile['side'], profile['hide_render']), (True, 'BACK', 'FRONT', True))
            self.assertTrue(Path(profile['image']).resolve().is_relative_to(evidence.resolve()))
            # Bottom-left Blender pixel of the profile crop is sheet pixel (410, 919); top-right is (739, 0).
            self.assertEqual(profile['bottom_left'], list(pattern(410, 919)))
            self.assertEqual(profile['top_right'], list(pattern(739, 0)))
            self.assertEqual(objects['Ref_Left']['top_right'], [230, 0, 7, 255])
            camera = objects['RefCam_Right']
            self.assertEqual((camera['type'], camera['fit']), ('ORTHO', 'VERTICAL'))
            self.assertAlmostEqual(camera['ortho'], 1.84)
            self.assertGreater(camera['location'][0], 1.84)
            self.assertAlmostEqual(camera['rotation'][2], math.pi / 2, places=5)
            self.assertEqual({o['collection'] for o in objects.values()}, {'Reference Board'})

            output_digest = hashlib.sha256(output.read_bytes()).hexdigest()
            rerun = invoke(output)
            self.assertNotEqual(rerun.returncode, 0)
            self.assertIn('new file', rerun.stdout + rerun.stderr)
            self.assertEqual(hashlib.sha256(output.read_bytes()).hexdigest(), output_digest)

            clash = root / 'clash.json'
            clash.write_text(json.dumps(dict(schema=board.SCHEMA, collection='Refs', views=[dict(views[0], cameraName='Hero')])))
            failed = invoke(root / 'clash.blend', clash)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn("refusing to replace existing data: object 'Hero'", failed.stdout + failed.stderr)
            self.assertFalse((root / 'clash.blend').exists())
            self.assertFalse((root / 'clash_reference_board').exists())
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), sources[source])


if __name__ == '__main__':
    unittest.main()
