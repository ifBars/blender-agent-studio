"""Bounded authored .blend preflight and still rendering. Never saves the source.

Run using Blender --background --factory-startup --disable-autoexec
--python-exit-code 1 --python render_scene.py -- --input scene.blend
--output-dir NEW_DIRECTORY [--inspect-only] [--camera 'Camera name'].
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import bpy


def arguments():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', required=True)
    p.add_argument('--output-dir', required=True)
    p.add_argument('--inspect-only', action='store_true')
    p.add_argument('--scene', default='')
    p.add_argument('--camera', dest='cameras', action='append', default=[])
    p.add_argument('--frames', nargs='*', type=int, default=[])
    p.add_argument('--max-edge', type=int, default=1280)
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--device', choices=['auto', 'cpu', 'OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'], default='auto')
    p.add_argument('--time-limit', type=int, default=120)
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    if not 128 <= a.max_edge <= 4096 or not 1 <= a.samples <= 4096 or not 1 <= a.time_limit <= 1800:
        p.error('max-edge must be 128..4096, samples 1..4096 and time-limit 1..1800 seconds')
    if len(a.cameras) > 6 or len(a.frames) > 12 or max(1, len(a.cameras)) * max(1, len(a.frames)) > 12:
        p.error('At most 6 cameras and 12 total camera/frame renders are permitted')
    if any(not -1_048_574 <= f <= 1_048_574 for f in a.frames):
        p.error('Frames must be within Blender limits: -1048574..1048574')
    if len(set(a.frames)) != len(a.frames) or len(set(a.cameras)) != len(a.cameras):
        p.error('Duplicate cameras or frames are not supported')
    return a


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def preflight(scene):
    missing = []
    for image in bpy.data.images:
        if image.source == 'FILE' and image.filepath and not image.packed_file:
            path = bpy.path.abspath(image.filepath, library=image.library)
            if not Path(path).is_file():
                missing.append({'kind': 'image', 'name': image.name, 'path': path})
    for library in bpy.data.libraries:
        path = bpy.path.abspath(library.filepath)
        if not Path(path).is_file():
            missing.append({'kind': 'library', 'name': library.name, 'path': path})
    volumes = [m.name for m in bpy.data.materials if m.node_tree and any(
        n.type == 'OUTPUT_MATERIAL' and n.inputs['Volume'].is_linked for n in m.node_tree.nodes)]
    cameras = [{'name': o.name, 'lens': o.data.lens, 'type': o.data.type,
                'location': list(o.location), 'clipStart': o.data.clip_start, 'clipEnd': o.data.clip_end}
               for o in scene.objects if o.type == 'CAMERA']
    lights = [{'name': o.name, 'type': o.data.type, 'energy': o.data.energy,
               'color': list(o.data.color), 'hidden': o.hide_render}
              for o in scene.objects if o.type == 'LIGHT']
    warnings = []
    if missing: warnings.append('Missing external dependencies can change the rendered appearance.')
    if not scene.camera: warnings.append('No active camera: select one of the named scene cameras.')
    if volumes: warnings.append('Volume materials present: judge shafts/noise in authored lighting, not a replacement studio.')
    if scene.render.use_border: warnings.append('Authored render border is enabled; output may be cropped.')
    editor = scene.sequence_editor
    strips = getattr(editor, 'strips', getattr(editor, 'sequences', [])) if editor else []
    if scene.render.use_sequencer and len(strips): warnings.append('Sequencer contains strips and is enabled; it can replace the camera beauty output.')
    return {'scene': scene.name, 'engine': scene.render.engine,
            'activeCamera': scene.camera.name if scene.camera else None,
            'cameras': cameras, 'lights': lights, 'volumeMaterials': volumes,
            'world': scene.world.name if scene.world else None,
            'colorManagement': {'viewTransform': scene.view_settings.view_transform,
                                'look': scene.view_settings.look, 'exposure': scene.view_settings.exposure,
                                'gamma': scene.view_settings.gamma},
            'resolution': [scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage],
            'frame': scene.frame_current,
            'images': [{'name': i.name, 'size': list(i.size), 'colorSpace': i.colorspace_settings.name,
                        'packed': bool(i.packed_file), 'source': i.source}
                       for i in bpy.data.images if i.source in {'FILE', 'TILED'}],
            'missingDependencies': missing, 'warnings': warnings}


def configure_device(scene, requested):
    if scene.render.engine != 'CYCLES':
        return {'requested': requested, 'effective': 'engine-managed', 'devices': []}
    if requested == 'cpu':
        scene.cycles.device = 'CPU'
        return {'requested': requested, 'effective': 'CPU', 'devices': []}
    prefs = bpy.context.preferences.addons['cycles'].preferences
    errors = []
    for backend in (['OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'] if requested == 'auto' else [requested]):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            selected = [d for d in prefs.devices if d.type == backend]
            if not selected: continue
            for d in prefs.devices: d.use = d.type == backend
            scene.cycles.device = 'GPU'
            return {'requested': requested, 'effective': backend, 'devices': [d.name for d in selected]}
        except (TypeError, RuntimeError) as e:
            errors.append(str(e))
    if requested != 'auto':
        raise RuntimeError(f'Requested Cycles backend {requested} is unavailable: {errors}')
    scene.cycles.device = 'CPU'
    return {'requested': requested, 'effective': 'CPU', 'devices': [], 'fallback': 'No supported GPU discovered'}


def mute_file_outputs():
    # Preserve the artistic compositor; prevent its File Output nodes from
    # writing to paths embedded in the source (including shared node groups).
    muted = []
    trees = list(bpy.data.node_groups)
    trees += [s.node_tree for s in bpy.data.scenes if getattr(s, 'node_tree', None)]
    for tree in trees:
        for node in tree.nodes:
            if node.type == 'OUTPUT_FILE' and not node.mute:
                node.mute = True
                muted.append(f'{tree.name}/{node.name}')
    return muted


def main():
    a = arguments()
    source = Path(a.input).resolve()
    if source.suffix.lower() != '.blend' or not source.is_file():
        raise ValueError('Authored rendering requires an existing .blend file')
    output = Path(a.output_dir).resolve()
    # A fresh directory makes failures unambiguous and avoids stale manifests.
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output directory must be new or empty; use a separate directory per run')
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
    scene = bpy.data.scenes.get(a.scene) if a.scene else bpy.context.scene
    if scene is None: raise ValueError(f'Unknown scene: {a.scene}')
    bpy.context.window.scene = scene
    manifest = {'schemaVersion': 1, 'status': 'preflight', 'source': str(source),
                'sourceSha256': sha256(source), 'blenderVersion': bpy.app.version_string,
                'blenderBuildHash': bpy.app.build_hash.decode(), 'preflight': preflight(scene), 'renders': []}
    manifest_path = output / 'render-manifest.json'
    def save(): manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    save()
    if a.inspect_only: return
    try:
        cameras = a.cameras or ([scene.camera.name] if scene.camera else [])
        if not cameras: raise ValueError('No active camera; select an existing camera by name')
        for name in cameras:
            if name not in scene.objects or scene.objects[name].type != 'CAMERA':
                raise ValueError(f'Camera does not exist in selected scene: {name}')
        frames = a.frames or [scene.frame_current]
        width = scene.render.resolution_x * scene.render.resolution_percentage / 100
        height = scene.render.resolution_y * scene.render.resolution_percentage / 100
        scale = min(1.0, a.max_edge / max(width, height))
        scene.render.resolution_x = max(1, round(width * scale))
        scene.render.resolution_y = max(1, round(height * scale))
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '8'
        scene.render.use_file_extension = True
        manifest['mutedFileOutputs'] = mute_file_outputs()
        if scene.render.engine == 'CYCLES':
            scene.cycles.samples = min(scene.cycles.samples, a.samples)
            scene.cycles.time_limit = a.time_limit
        manifest['device'] = configure_device(scene, a.device)
        manifest['effective'] = {'resolution': [scene.render.resolution_x, scene.render.resolution_y],
                                 'samples': scene.cycles.samples if scene.render.engine == 'CYCLES' else None,
                                 'timeLimitSeconds': a.time_limit if scene.render.engine == 'CYCLES' else None,
                                 'denoise': scene.cycles.use_denoising if scene.render.engine == 'CYCLES' else None,
                                 'compositing': scene.render.use_compositing,
                                 'sequencer': scene.render.use_sequencer,
                                 'border': scene.render.use_border}
        manifest['status'] = 'rendering'; save()
        for i, name in enumerate(cameras):
            for frame in frames:
                scene.frame_set(frame)
                # Set after frame evaluation so camera markers cannot override
                # an explicitly selected diagnostic camera.
                scene.camera = scene.objects[name]
                path = output / f'camera-{i+1:02d}_frame-{frame:06d}.png'
                scene.render.filepath = str(path)
                start = time.monotonic()
                bpy.ops.render.render(write_still=True, scene=scene.name)
                if not path.is_file(): raise RuntimeError(f'Render did not produce {path}')
                manifest['renders'].append({'camera': name, 'frame': frame, 'path': str(path),
                                            'durationSeconds': round(time.monotonic()-start, 3),
                                            'sha256': sha256(path)})
                save()
        manifest['status'] = 'complete'
    except Exception as e:
        manifest['status'] = 'failed'; manifest['error'] = str(e)
        raise
    finally:
        save()


if __name__ == '__main__':
    main()
