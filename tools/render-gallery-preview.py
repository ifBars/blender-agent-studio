"""Render gallery previews from saved models; never rewrite benchmark evidence."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'plugins/blender-agent-studio/skills/blender-asset-validation/scripts'))
import render_evidence as evidence
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'plugins/blender-agent-studio/skills/blender-rendering-workflow/scripts'))
from render_scene import configure_denoising


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--views', default='perspective,front,back,left,right,top,bottom')
    parser.add_argument('--hide-objects-json', default='[]')
    parser.add_argument('--resolution', type=int, default=1536)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if not 384 <= args.resolution <= 1536:
        raise ValueError('Preview resolution must be 384..1536 pixels')
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    if output.exists():
        raise ValueError('Use a fresh preview directory')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    hidden = json.loads(args.hide_objects_json)
    if not isinstance(hidden, list) or not all(isinstance(name, str) and name for name in hidden):
        raise ValueError('Hidden objects must be explicit names')
    views = args.views.split(',')
    directions = {'perspective': (1.4,-1.7,1.2), 'front': (0,-1,.05), 'back': (0,1,.05),
                  'left': (-1,0,.05), 'right': (1,0,.05), 'top': (0,0,1), 'bottom': (0,0,-1)}
    if not views or len(set(views)) != len(views) or not set(views) <= directions.keys():
        raise ValueError('Unknown or duplicate view')
    evidence.load_asset(source)
    for name in hidden:
        obj = bpy.context.scene.objects.get(name)
        if obj is None or obj.type != 'MESH':
            raise ValueError(f'Unknown staging mesh: {name}')
        obj.hide_render = True
    mins, maxs = evidence.scene_bounds()
    size, center = maxs-mins, (mins+maxs)*.5
    extent = max(max(size), 1e-4)
    evidence.configure_scene(center, extent, mins.z, False, 'neutral')
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    devices = [d for d in prefs.devices if d.type == 'OPTIX']
    if not devices:
        raise RuntimeError('This gallery preset requires an OptiX device')
    for device in prefs.devices:
        device.use = device.type == 'OPTIX'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 64
    scene.cycles.use_adaptive_sampling = False
    denoise = configure_denoising(scene, 'final', {'effective':'OPTIX'})
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.max_bounces = 12
    scene.cycles.diffuse_bounces = 4
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 12
    scene.cycles.transparent_max_bounces = 8
    scene.render.use_motion_blur = False
    for layer in scene.view_layers:
        layer.cycles.use_denoising = True
    if 'bottom' in views:
        evidence.add_area_light('BAS_UndersideFill', center+Vector((0,0,-extent*2)), center, extent*extent*80, extent)
    camera = evidence.create_camera()
    camera.data.dof.use_dof = False
    output.mkdir(parents=True)
    for view in views:
        evidence.render_view(camera, view, Vector(directions[view]), center+Vector((0,0,size.z*.04)), extent, output, args.resolution, view!='perspective')
    if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
        raise RuntimeError('Source changed while rendering')
    manifest = {'preset':'gallery-cycles-v2','sourceSha256':source_hash,'resolution':args.resolution,'engine':'CYCLES',
                'samples':64,'denoiser':scene.cycles.denoiser,'denoise':denoise,'device':'OPTIX','views':views,'hiddenStagingObjects':hidden,
                'sourceModified':False,'blenderVersion':bpy.app.version_string,
                'purpose':'Display preview only. Historical scores and reviews refer to original evidence.'}
    (output/'preview.json').write_text(json.dumps(manifest,indent=2))

if __name__ == '__main__':
    main()
