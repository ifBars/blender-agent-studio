"""Fixed, offline setup fixture. Run only through doctor.ts in a new directory."""
import json
import sys
from pathlib import Path

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
output = Path(args[0])
render = '--skip-render' not in args[1:]
report = {'blenderVersion': bpy.app.version_string, 'checks': []}


def render_eevee():
    """Separate process: a missing OpenGL context aborts Blender outright."""
    bpy.ops.wm.open_mainfile(filepath=str(output / 'setup-check.blend'), use_scripts=False)
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.render.bl_rna.properties['engine'].enum_items}
    scene.render.engine = next(e for e in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT') if e in engines)
    scene.render.resolution_x = scene.render.resolution_y = 64
    scene.render.filepath = str(output / 'eevee-preview.png')
    bpy.ops.render.render(write_still=True)


def passed(name):
    report['checks'].append(name)
    (output / 'probe.json').write_text(json.dumps(report, indent=2))


if '--eevee' in args[1:]:
    render_eevee()
    raise SystemExit(0)

passed('python')
bpy.ops.wm.read_factory_settings(use_empty=False)
scene = bpy.context.scene
scene.name = 'Blender Agent Studio setup check'
if render:
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 4
    scene.cycles.use_denoising = False
    scene.cycles.time_limit = 15
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.resolution_x = scene.render.resolution_y = 128
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(output / 'preview.png')
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
cube = bpy.data.objects['Cube']
material = bpy.data.materials.new('Studio orange')
material.diffuse_color = (0.9, 0.18, 0.035, 1)
material.use_nodes = True
material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = material.diffuse_color
cube.data.materials.clear()
cube.data.materials.append(material)
bevel = cube.modifiers.new('Soft edges', 'BEVEL')
bevel.width = 0.12
bevel.segments = 3
blend = output / 'setup-check.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
passed('save')
bpy.ops.wm.open_mainfile(filepath=str(blend), use_scripts=False)
assert bpy.context.scene.name == 'Blender Agent Studio setup check'
assert bpy.data.objects.get('Cube') is not None
passed('reopen')
if render:
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(output / 'preview.png'), check_existing=False)
    assert tuple(image.size) == (128, 128), 'Unexpected smoke-render dimensions'
    passed('cpu-render')
