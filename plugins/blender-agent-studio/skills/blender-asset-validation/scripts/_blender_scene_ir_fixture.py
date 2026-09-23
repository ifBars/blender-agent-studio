"""Deterministic fixture for the Blender -> SceneIR -> Rust -> MCP regression."""
from pathlib import Path
import sys
import bpy

destination = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)
assembly = bpy.data.objects.new('assembly', None)
bpy.context.collection.objects.link(assembly)
assembly.location.x = 10
bpy.ops.mesh.primitive_cube_add()
body = bpy.context.object
body.name = 'body'
body.parent = assembly
body.location.x = 1
body.scale = (2, 1, .5)
body['bas_role'] = 'torso'
array = body.modifiers.new('two_parts', 'ARRAY')
array.count = 2
array.relative_offset_displace = (1, 0, 0)
bpy.ops.mesh.primitive_cube_add()
foot = bpy.context.object
foot.name = 'foot'
foot.parent = assembly
foot.location = (0, 0, 3)
foot['bas_role'] = 'foot'
foot.keyframe_insert(data_path='location', frame=1)
foot.location.z = 5
foot.keyframe_insert(data_path='location', frame=20)
bpy.context.scene.frame_set(1)
material = bpy.data.materials.new('fixture')
body.data.materials.append(material)
foot.data.materials.append(material)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(destination / 'fixture.blend'))
bpy.ops.export_scene.gltf(filepath=str(destination / 'fixture.glb'), export_apply=True)
bpy.context.scene.frame_set(20)
bpy.ops.wm.save_as_mainfile(filepath=str(destination / 'posed.blend'))
bpy.context.scene.frame_set(1)
bpy.context.scene.unit_settings.scale_length = 2
bpy.ops.wm.save_as_mainfile(filepath=str(destination / 'units.blend'))
