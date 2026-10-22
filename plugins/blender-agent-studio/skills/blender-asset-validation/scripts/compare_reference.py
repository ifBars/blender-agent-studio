"""Compare an authored camera's projected geometry with an explicit reference.

Runs inside Blender. Never saves the source or guesses foreground/camera pose.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
import math


def load_pixels(path: Path, size=None):
    image = bpy.data.images.load(str(path), check_existing=False)
    original_size = tuple(image.size)
    if not all(original_size) or original_size[0] * original_size[1] > 16_777_216:
        raise ValueError("Reference images must contain 1 to 16 million pixels")
    if size:
        image.scale(*size)
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(height, width, 4), original_size


def save_pixels(path: Path, pixels):
    height, width, _ = pixels.shape
    image = bpy.data.images.new(path.stem, width=width, height=height, alpha=True)
    image.pixels.foreach_set(np.ascontiguousarray(pixels).ravel())
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def occupied_bounds(mask):
    ys, xs = np.nonzero(mask[::-1])
    if not len(xs):
        return None
    return {'left': int(xs.min()), 'top': int(ys.min()),
            'width': int(xs.max() - xs.min() + 1), 'height': int(ys.max() - ys.min() + 1)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--reference', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--mask')
    parser.add_argument('--camera')
    parser.add_argument('--max-edge', type=int, default=512)
    parser.add_argument('--landmarks-json', default='[]')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source, reference = Path(args.input).resolve(), Path(args.reference).resolve()
    output = Path(args.output_dir).resolve()
    if source.suffix.lower() != '.blend' or not source.is_file() or not reference.is_file():
        raise ValueError('Supply an existing .blend and reference image')
    if not 128 <= args.max_edge <= 1024:
        raise ValueError('max-edge must be 128 to 1024')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError('Output directory must be new or empty')
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    camera = scene.objects.get(args.camera) if args.camera else scene.camera
    if camera is None or camera.type != 'CAMERA':
        raise ValueError('Set an authored reference camera or supply its exact camera name')
    scene.camera = camera
    landmarks = json.loads(args.landmarks_json)
    if not isinstance(landmarks, list) or len(landmarks) > 32:
        raise ValueError('At most 32 landmarks are supported')
    ref, original_size = load_pixels(reference)
    scale = min(1.0, args.max_edge / max(original_size))
    size = tuple(max(1, round(d * scale)) for d in original_size)
    ref, _ = load_pixels(reference, size)
    width, height = size
    # Composite reference transparency against neutral gray for visual review.
    ref[:, :, :3] = ref[:, :, :3] * ref[:, :, 3:4] + 0.18 * (1 - ref[:, :, 3:4])
    ref[:, :, 3] = 1
    expected = None
    mask_path = Path(args.mask).resolve() if args.mask else None
    if mask_path:
        mask, mask_size = load_pixels(mask_path, size)
        if mask_size != original_size:
            raise ValueError('Mask must have the exact reference dimensions; no independent alignment is applied')
        expected = mask[:, :, :3].mean(axis=2) >= 0.5
        if not expected.any() or expected.all():
            raise ValueError('Mask needs both white foreground and black background')

    # Geometry-only pass: preserve transforms and camera, remove shading ambiguity.
    for engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    scene.render.use_border = False
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
    scene.render.use_motion_blur = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    camera.data.dof.use_dof = False
    material = bpy.data.materials.new('BAS_REFERENCE_GEOMETRY')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (1, 1, 1, 1)
    material.node_tree.links.new(emission.outputs[0], nodes.new('ShaderNodeOutputMaterial').inputs['Surface'])
    for layer in scene.view_layers:
        layer.material_override = material
    scene.render.filepath = str(output / 'geometry.png')
    bpy.ops.render.render(write_still=True)
    rendered, _ = load_pixels(output / 'geometry.png')
    actual = rendered[:, :, 3] >= 0.5
    silhouette = np.ones((height, width, 4), dtype=np.float32)
    silhouette[:, :, :3] = actual[:, :, None]
    overlay = ref.copy()
    metrics = None
    if expected is not None:
        common, missing, excess = actual & expected, expected & ~actual, actual & ~expected
        for region, color in ((common, (0.1, 0.8, 0.2)), (missing, (1, 0.1, 0.5)), (excess, (0.0, 0.7, 1))):
            overlay[region, :3] = 0.35 * ref[region, :3] + 0.65 * np.array(color)
        union = actual | expected
        metrics = {
            'iou': float(common.sum() / union.sum()),
            'reference_pixels': int(expected.sum()), 'model_pixels': int(actual.sum()),
            'missing_pixels': int(missing.sum()), 'excess_pixels': int(excess.sum()),
            'reference_bounds_pixels': occupied_bounds(expected),
            'model_bounds_pixels': occupied_bounds(actual),
            'row_width_profile': [],
        }
        # Coordinates are reported from image top, unlike Blender's pixel buffer.
        for fraction in (0.1, 0.25, 0.5, 0.75, 0.9):
            row = height - 1 - round((height - 1) * fraction)
            metrics['row_width_profile'].append({
                'y_from_top': fraction, 'reference_occupied_pixels': int(expected[row].sum()),
                'model_occupied_pixels': int(actual[row].sum()),
            })
    else:
        overlay[actual, :3] = 0.55 * ref[actual, :3] + 0.45 * np.array((0, 0.7, 1))
    landmark_results = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for item in landmarks:
        uv, local = item['referenceUv'], item.get('localPoint', [0, 0, 0])
        if (len(uv) != 2 or len(local) != 3 or
                not all(isinstance(v, (int, float)) and math.isfinite(v) for v in [*uv, *local]) or
                not all(0 <= v <= 1 for v in uv)):
            raise ValueError('Landmarks require finite localPoint XYZ and referenceUv XY in [0,1] from image top-left')
        obj = scene.objects.get(item['objectName'])
        if obj is None:
            raise ValueError(f"Unknown landmark object: {item['objectName']}")
        point = obj.evaluated_get(depsgraph).matrix_world @ Vector(local)
        projected = world_to_camera_view(scene, camera.evaluated_get(depsgraph), point)
        model_uv = [float(projected.x), float(1 - projected.y)]
        in_front = projected.z > 0
        in_frame = in_front and all(0 <= value <= 1 for value in model_uv)
        delta = [(model_uv[0] - uv[0]) * width, (model_uv[1] - uv[1]) * height] if in_front else None
        landmark_results.append({'name': item['name'], 'object': obj.name,
            'local_point': local, 'world_point': list(point),
            'reference_uv': uv, 'model_uv': model_uv if in_front else None,
            'delta_pixels': delta, 'error_pixels': math.hypot(*delta) if delta else None,
            'in_front_of_camera': in_front, 'in_frame': in_frame,
            'visibility': 'not_tested_for_occlusion'})
        for coordinate, color in ((uv, (1, 0.85, 0)), (model_uv if in_frame else None, (0.2, 0.2, 1))):
            if coordinate is None:
                continue
            x = min(width - 1, round(coordinate[0] * width))
            y = min(height - 1, round((1 - coordinate[1]) * height))
            overlay[max(0,y-2):min(height,y+3), x, :3] = color
            overlay[y, max(0,x-2):min(width,x+3), :3] = color
    save_pixels(output / 'reference.png', ref)
    save_pixels(output / 'silhouette.png', silhouette)
    save_pixels(output / 'overlay.png', overlay)
    save_pixels(output / 'comparison.png', np.concatenate((ref, silhouette, overlay), axis=1))
    report = {
        'schema_version': 1, 'scope': 'projected_geometry_reference_comparison',
        'source': str(source), 'source_sha256': digest(source),
        'reference': str(reference), 'reference_sha256': digest(reference),
        'mask': str(mask_path) if mask_path else None,
        'mask_sha256': digest(mask_path) if mask_path else None,
        'resolution': list(size), 'frame': scene.frame_current,
        'camera': {'name': camera.name, 'type': camera.data.type, 'lens': camera.data.lens,
                   'ortho_scale': camera.data.ortho_scale,
                   'shift_x': camera.data.shift_x, 'shift_y': camera.data.shift_y,
                   'sensor_fit': camera.data.sensor_fit,
                   'sensor_width': camera.data.sensor_width, 'sensor_height': camera.data.sensor_height,
                   'matrix_world': [list(row) for row in camera.matrix_world]},
        'metrics': metrics,
        'landmarks': landmark_results,
        'model_touches_image_border': bool(actual[0].any() or actual[-1].any() or actual[:, 0].any() or actual[:, -1].any()),
        'legend': {'panel_order': ['reference', 'projected_geometry', 'overlay'],
                   'yellow_cross': 'reference landmark', 'blue_cross': 'projected model landmark',
                   'green': 'overlap', 'pink': 'missing model coverage', 'cyan': 'excess model coverage' if expected is not None else 'model coverage; no reference mask'},
        'limitations': ['Camera, crop and pose must match before interpreting geometry differences.',
                       'No camera estimation, segmentation, image registration or automatic geometry repair is performed.',
                       'Silhouette treats transparent surfaces as opaque; hidden and excluded geometry follows authored visibility.',
                       'One projection cannot establish depth, surface quality, hidden structure or overall similarity.'],
        'comparison': str(output / 'comparison.png'), 'overlay': str(output / 'overlay.png'),
    }
    (output / 'comparison.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'BLENDER_AGENT_STUDIO_REFERENCE={output / "comparison.json"}')


if __name__ == '__main__':
    main()
