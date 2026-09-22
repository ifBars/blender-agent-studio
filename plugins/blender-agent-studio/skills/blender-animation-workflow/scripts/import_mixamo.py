"""Import one downloaded Mixamo FBX into a new standalone Blender scene."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--clip-name', required=True)
    parser.add_argument('--fps', type=int, choices=(24, 30, 60), default=30)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source, output = Path(args.input).resolve(), Path(args.output_dir).resolve()
    if not source.is_file() or source.suffix.lower() != '.fbx':
        raise ValueError('An existing downloaded FBX file is required')
    if not args.clip_name.strip() or len(args.clip_name) > 120:
        raise ValueError('Clip name must contain 1–120 characters')
    # Reserve an entirely new output directory; never overwrite an earlier run.
    output.mkdir(parents=True, exist_ok=False)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = args.fps
    scene.render.fps_base = 1
    if hasattr(bpy.ops.wm, 'fbx_import'):
        bpy.ops.wm.fbx_import(filepath=str(source), use_anim=True)
    else:
        bpy.ops.import_scene.fbx(filepath=str(source), use_anim=True)
    rigs = [obj for obj in scene.objects if obj.type == 'ARMATURE']
    animated = [obj for obj in rigs if obj.animation_data and obj.animation_data.action]
    if not animated:
        raise ValueError('FBX has no armature with an active animation action')
    actions = list(dict.fromkeys(obj.animation_data.action for obj in animated))
    for index, action in enumerate(actions):
        action.name = args.clip_name.strip() if len(actions) == 1 else f'{args.clip_name.strip()}_{index + 1}'
        action.use_fake_user = True
    scene.frame_start = math.floor(min(action.frame_range[0] for action in actions))
    scene.frame_end = math.ceil(max(action.frame_range[1] for action in actions))
    scene.frame_set(scene.frame_start)
    candidate = output / 'animation.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
    with source.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    report = {
        'source': str(source), 'source_sha256': digest,
        'candidate': str(candidate), 'blender_version': bpy.app.version_string,
        'fps': scene.render.fps / scene.render.fps_base,
        'frame_range': [scene.frame_start, scene.frame_end],
        'armatures': [{'name': rig.name, 'bone_count': len(rig.data.bones)} for rig in rigs],
        'mesh_count': sum(obj.type == 'MESH' for obj in scene.objects),
        'actions': [{'name': action.name, 'frame_range': list(action.frame_range)} for action in actions],
        'limitations': ['Imports the downloaded skeleton; does not retarget to another character.',
                        'FBX origin is user-supplied, not authenticated as Mixamo.',
                        'Inspect poses and playback before accepting motion quality.'],
    }
    (output / 'mixamo-import.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
