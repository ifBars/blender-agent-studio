"""Render recorded build checkpoints with a locked final camera. No source saves."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_scene import configure_device, preflight, sha256, mute_file_outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--max-edge', type=int, default=720)
    parser.add_argument('--samples', type=int, default=16)
    parser.add_argument('--time-limit', type=int, default=30)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if not 128 <= args.max_edge <= 1920 or not 1 <= args.samples <= 128 or not 1 <= args.time_limit <= 120:
        parser.error('max-edge 128..1920; samples 1..128; time-limit 1..120')
    manifest_path = Path(args.manifest).resolve()
    capture = json.loads(manifest_path.read_text(encoding='utf-8'))
    entries = capture['checkpoints']
    if capture.get('schemaVersion') != 1 or capture.get('status') != 'complete' or not 3 <= len(entries) <= 64:
        raise ValueError('A complete capture with 3..64 actual checkpoints is required')
    if entries[0]['kind'] != 'initial' or entries[-1]['kind'] != 'final':
        raise ValueError('Capture must start with the initial scene and end with the final scene')
    paths = []
    for entry in entries:
        path = (manifest_path.parent / entry['file']).resolve()
        if path.parent != manifest_path.parent or path.suffix.lower() != '.blend':
            raise ValueError('Checkpoints must be .blend files beside the manifest')
        if sha256(path) != entry['sha256']:
            raise ValueError(f'Checkpoint changed: {path}')
        paths.append(path)
    output = Path(args.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=False)
    bpy.ops.wm.open_mainfile(filepath=str(paths[-1]), use_scripts=False)
    final_scene = bpy.data.scenes[entries[-1]['scene']]
    bpy.context.window.scene = final_scene
    final_scene.frame_set(entries[-1]['frame'])
    if not final_scene.camera:
        raise ValueError('Final checkpoint needs an authored active camera')
    bpy.context.view_layer.update()
    camera_name = final_scene.camera.name
    camera_matrix = final_scene.camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.copy()
    width, height = final_scene.render.resolution_x, final_scene.render.resolution_y
    ratio = args.max_edge / max(width, height)
    resolution = [max(2, round(width * ratio) // 2 * 2), max(2, round(height * ratio) // 2 * 2)]
    engine = final_scene.render.engine
    view = {key: getattr(final_scene.view_settings, key) for key in ('view_transform', 'look', 'exposure', 'gamma')}
    records = []
    for index, (entry, path) in enumerate(zip(entries, paths)):
        bpy.ops.wm.open_mainfile(filepath=str(path), use_scripts=False)
        scene = bpy.data.scenes[entry['scene']]
        bpy.context.window.scene = scene
        scene.frame_set(entry['frame'])
        # Earlier milestones borrow only final camera/light/world data. No final meshes.
        if index != len(entries) - 1:
            with bpy.data.libraries.load(str(paths[-1]), link=False) as (_, target):
                target.scenes = [entries[-1]['scene']]
            reference = target.scenes[0]
            bpy.context.window.scene = reference
            reference.frame_set(entries[-1]['frame'])
            bpy.context.view_layer.update()
            reference_graph = bpy.context.evaluated_depsgraph_get()
            reference_lights = [(light, light.evaluated_get(reference_graph).matrix_world.copy(),
                                 light.evaluated_get(reference_graph).data.copy())
                                for light in reference.objects if light.type == 'LIGHT' and not light.hide_render]
            source_camera = reference.objects[camera_name].evaluated_get(reference_graph)
            camera_data = source_camera.data.copy()
            bpy.context.window.scene = scene
            for light in list(scene.objects):
                if light.type == 'LIGHT':
                    bpy.data.objects.remove(light, do_unlink=True)
            for light, matrix, data in reference_lights:
                clone = light.copy()
                clone.data = data
                clone.data.animation_data_clear()
                clone.parent = None
                clone.animation_data_clear()
                clone.constraints.clear()
                clone.matrix_world = matrix
                scene.collection.objects.link(clone)
            scene.world = reference.world
            source_camera = reference.objects[camera_name]
        else:
            source_camera = scene.objects[camera_name]
            camera_data = source_camera.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.copy()
        camera = source_camera.copy()
        camera.data = camera_data
        camera.data.animation_data_clear()
        camera.parent = None
        camera.animation_data_clear()
        camera.constraints.clear()
        camera.matrix_world = camera_matrix
        scene.collection.objects.link(camera)
        scene.camera = camera
        scene.render.engine = engine
        for key, value in view.items():
            setattr(scene.view_settings, key, value)
        scene.render.resolution_x, scene.render.resolution_y = resolution
        scene.render.resolution_percentage = 100
        # Crops/strips can obscure progress; compositor file sinks must never write elsewhere.
        scene.render.use_border = False
        scene.render.use_sequencer = False
        muted = mute_file_outputs()
        device = configure_device(scene, 'auto')
        if engine == 'CYCLES':
            scene.cycles.samples = min(scene.cycles.samples, args.samples)
            scene.cycles.time_limit = args.time_limit
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGB'
        scene.render.filepath = str(output / f'{index:03d}.png')
        bpy.context.view_layer.update()
        report = preflight(scene)
        bpy.ops.render.render(write_still=True, scene=scene.name)
        if sha256(path) != entry['sha256']:
            raise RuntimeError(f'Source checkpoint changed: {path}')
        records.append({**entry, 'path': scene.render.filepath,
                        'lighting': 'authored_final' if index == len(entries) - 1 else 'final_light_world_preview',
                        'renderLights': [{'type': light.data.type, 'matrixWorld': [list(row) for row in light.matrix_world]}
                                         for light in scene.objects if light.type == 'LIGHT' and not light.hide_render],
                        'preflight': report, 'device': device, 'mutedFileOutputs': muted})
        print(f'Timelapse checkpoint {index + 1}/{len(entries)}: {entry["label"]}', flush=True)
    report = {'schemaVersion': 1, 'status': 'rendered', 'blenderVersion': bpy.app.version_string,
              'camera': camera_name, 'cameraMatrix': [list(row) for row in camera_matrix],
              'resolution': resolution, 'engine': engine, 'checkpoints': records,
              'limitations': ['Discrete authored checkpoints, not a screen recording of every operation.',
                              'Earlier stages use the final camera, lights and world; geometry and materials are captured.',
                              'Simulation caches and external dependencies must remain available.']}
    (output / 'render-manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
