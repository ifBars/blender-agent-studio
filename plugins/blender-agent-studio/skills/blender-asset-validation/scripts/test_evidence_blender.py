"""Optional live renderer regression; runs when Blender is available."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')


@unittest.skipUnless(BLENDER, 'Blender is not installed; pure settings tests still run')
class BlenderEvidenceTests(unittest.TestCase):
    def test_scale_and_authored_state_do_not_change_the_studio(self):
        with tempfile.TemporaryDirectory(prefix='bas-evidence-') as output:
            result = subprocess.run([
                BLENDER, '--background', '--factory-startup', '--python-exit-code', '1',
                '--python', str(Path(__file__).with_name('_blender_evidence_smoke.py')),
                '--', output,
            ], capture_output=True, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('EVIDENCE_SMOKE_PASS', result.stdout)


if __name__ == '__main__':
    unittest.main()
