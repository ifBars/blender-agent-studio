import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')
SCRIPTS = Path(__file__).resolve().parent


@unittest.skipUnless(BLENDER, 'Blender needed for actual checkpoint tests')
class ModelingTimelapseTests(unittest.TestCase):
    def test_capture_is_opt_in_and_preserves_working_file(self):
        with tempfile.TemporaryDirectory(prefix='bas-progress-') as temp:
            root = Path(temp)
            script = root / 'capture-test.py'
            script.write_text('''import bpy, sys, json
from pathlib import Path
sys.path.insert(0, ''' + repr(str(SCRIPTS)) + ''')
from modeling_timelapse import ModelingTimelapse
root=Path(''' + repr(str(root)) + ''')
disabled=ModelingTimelapse(root/'disabled',enabled=False)
disabled.capture('ignored',final=True)
assert not (root/'disabled').exists()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'working.blend'))
working=bpy.data.filepath
capture=ModelingTimelapse(root/'progress',enabled=True)
assert bpy.data.filepath == working
try:
    capture.capture('too early',final=True)
    raise AssertionError('accepted missing milestone')
except ValueError: pass
bpy.context.object.name='Authored primary form'
bpy.context.object.scale=(1,2,0.5)
capture.capture('Primary forms')
bpy.context.object.location.z=0.5
capture.capture('Completed scene',final=True)
assert bpy.data.filepath == working
try:
    capture.capture('after final')
    raise AssertionError('accepted extra stage')
except ValueError: pass
try:
    ModelingTimelapse(root/'late',enabled=True)
    raise AssertionError('accepted late start')
except ValueError: pass
''', encoding='utf-8')
            proc = subprocess.run([BLENDER,'--background','--factory-startup','--python-exit-code','1','--python',str(script)], capture_output=True, text=True, timeout=90)
            self.assertEqual(proc.returncode,0,proc.stdout+proc.stderr)
            capture = json.loads((root/'progress/capture.json').read_text())
            self.assertEqual(capture['status'],'complete')
            self.assertEqual([e['kind'] for e in capture['checkpoints']],['initial','checkpoint','final'])
            self.assertEqual(len(list((root/'progress').glob('*.blend'))),3)


if __name__ == '__main__': unittest.main()
