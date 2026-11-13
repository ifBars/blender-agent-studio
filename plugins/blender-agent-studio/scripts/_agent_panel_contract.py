"""Run in a clean background Blender to check the agent panel against real bpy."""
import importlib.util
import json
import os
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

# Live edits: refused until the user allows them, then one script edits the open scene.
os.environ['BAS_VIEWPORT_CONNECTION'] = str(out / 'connection.json')
addon.start()
bridge = addon._bridge
script = out / 'edit.py'
script.write_text("import bpy\nbpy.data.objects['UserCube'].location.z = 3\nprint('moved', len(bpy.data.objects))\n")
request = {'protocol': 1, 'token': bridge.token, 'command': 'run_python', 'params': {'scriptPath': str(script)}}
assert not manager.bas_live_edits, 'Live edits must be off by default'
try:
    bridge.dispatch(request)
    raise AssertionError('Live edit accepted while disallowed')
except ValueError as error:
    assert 'Live edits are off' in str(error)
assert bpy.data.objects['UserCube'].location.z == 0
manager.bas_live_edits = True
revision = bridge.revision
reply = bridge.dispatch(request)
assert reply['ok'] and reply['error'] is None and reply['output'].startswith('moved '), reply
assert bpy.data.objects['UserCube'].location.z == 3 and bridge.revision > revision
script.write_text("import bpy\nbpy.data.objects['UserCube'].location.x = 5\nraise RuntimeError('boom')\n")
reply = bridge.dispatch(request)
assert not reply['ok'] and 'RuntimeError: boom' in reply['error'] and 'edit.py' in reply['error'], reply
for bad in ('relative.py', str(out / 'edit.txt'), 7):
    try:
        bridge.dispatch(dict(request, params={'scriptPath': bad}))
        raise AssertionError('Bad script path accepted')
    except ValueError as error:
        assert 'absolute path to a .py file' in str(error)
manager.bas_live_edits = False
try:
    bridge.dispatch(request)
    raise AssertionError('Unticking the box must stop live edits at once')
except ValueError:
    pass

addon.unregister()
assert not hasattr(bpy.types.WindowManager, 'bas_prompt')
(out / 'agent-contract.json').write_text(json.dumps({'registration': True, 'sceneCopy': True, 'import': True, 'liveEdits': True}))
