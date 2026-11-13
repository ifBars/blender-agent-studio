"""Run in a clean background Blender to check the agent panel against real bpy."""
import importlib.util
import json
from pathlib import Path
import sys

import bpy

out = Path(sys.argv[sys.argv.index('--') + 1])
source = Path(__file__).resolve().parents[1] / 'addon' / 'blender_agent_studio_live.py'
spec = importlib.util.spec_from_file_location('bas_agent_contract', source)
addon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(addon)

addon.register()
manager = bpy.context.window_manager
assert manager.bas_agent == 'CLAUDE' and manager.bas_share_scene and manager.bas_auto_import
assert addon._session is None, 'Enabling the addon must not start an agent'
for name in ('agent_send', 'agent_stop', 'agent_reset', 'agent_import', 'agent_folder'):
    assert hasattr(bpy.ops.bas, name) and getattr(bpy.ops.bas, name).get_rna_type()
assert addon.preference('access', 'WORKSPACE') == 'WORKSPACE'

# Sharing the scene must not adopt the copy's path or mark the session saved.
before = (bpy.data.filepath, bpy.data.is_dirty)
bpy.ops.mesh.primitive_cube_add()
bpy.context.active_object.name = 'UserCube'
dirty = bpy.data.is_dirty
snapshot = out / 'scene' / 'current.blend'
snapshot.parent.mkdir()
addon.save_scene_copy(snapshot)
assert snapshot.is_file() and bpy.data.filepath == before[0] and bpy.data.is_dirty == dirty
with bpy.data.libraries.load(str(snapshot)) as (found, _):
    assert 'UserCube' in found.objects

# A deliverable is appended into its own collection; a revision hides the earlier one.
mesh = bpy.data.meshes.new('LampMesh')
mesh.from_pydata([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [], [(0, 1, 2)])
lamp = bpy.data.objects.new('Lamp', mesh)
shade = bpy.data.objects.new('Shade', None)
shade.parent = lamp
result = out / 'lamp.blend'
bpy.data.libraries.write(str(result), {lamp, shade})
bpy.data.objects.remove(shade)
bpy.data.objects.remove(lamp)
scene = bpy.context.scene
count = len(scene.objects)
first, added = addon.import_result(result, scene)
assert added == 2 and first.name == 'Agent: lamp' and len(scene.objects) == count + 2
assert first.objects['Shade'].parent == first.objects['Lamp']
assert first.objects['Lamp'].library is None and len(first.objects['Lamp'].data.polygons) == 1
second, _ = addon.import_result(result, scene)
assert first.hide_viewport and first.hide_render and not second.hide_viewport
assert len(first.objects) == 2, 'A revision must keep the earlier version'
assert bpy.ops.bas.agent_import(filepath=str(result)) == {'FINISHED'}
empty = out / 'empty.blend'
bpy.data.libraries.write(str(empty), {bpy.data.worlds.new('Only')})
try:
    addon.import_result(empty, scene)
    raise AssertionError('Empty result accepted')
except ValueError as error:
    assert 'no objects' in str(error)

addon.unregister()
assert not hasattr(bpy.types.WindowManager, 'bas_prompt')
(out / 'agent-contract.json').write_text(json.dumps({'registration': True, 'sceneCopy': True, 'import': True}))
