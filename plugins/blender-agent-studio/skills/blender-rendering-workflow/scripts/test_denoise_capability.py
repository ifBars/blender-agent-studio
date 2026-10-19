"""Capability regressions run without Blender; live probe covers distro builds."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('render_scene.py')


class DenoiseCapabilityTests(unittest.TestCase):
    def policy(self, oidn, optix=False, requested='preview', nodes=None):
        cycles = SimpleNamespace(use_denoising=True, denoiser='OPENIMAGEDENOISE',
            denoising_quality='BALANCED', denoising_prefilter='NONE',
            denoising_use_gpu=False, denoising_input_passes='RGB')
        scene = SimpleNamespace(render=SimpleNamespace(engine='CYCLES'), cycles=cycles)
        prefs = SimpleNamespace(has_oidn_gpu_devices=lambda: False,
                                has_optixdenoiser_gpu_devices=lambda: optix)
        bpy = SimpleNamespace(context=SimpleNamespace(preferences=SimpleNamespace(
            addons={'cycles': SimpleNamespace(preferences=prefs)})))
        spec = importlib.util.spec_from_file_location('render_scene_capability_test', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'bpy': bpy, '_cycles': SimpleNamespace(with_openimagedenoise=oidn)}):
            spec.loader.exec_module(module)
            module.active_compositor_denoise_nodes = lambda _: nodes or []
            result = module.configure_denoising(scene, requested, {'effective': 'OPTIX' if optix else 'CPU'})
        return result, cycles

    def test_missing_oidn_disables_only_automatic_policies(self):
        for requested in ('preview', 'final'):
            result, cycles = self.policy(False, requested=requested)
            self.assertEqual(result['requestedPolicy'], requested)
            self.assertEqual(result['effectivePolicy'], 'off')
            self.assertFalse(cycles.use_denoising)
            self.assertIn('not compiled', result['decisionReason'])
            self.assertIsNone(result['denoiser'])

    def test_supported_optix_is_still_used_without_oidn(self):
        result, cycles = self.policy(False, optix=True)
        self.assertEqual(result['effectivePolicy'], 'preview')
        self.assertEqual(cycles.denoiser, 'OPTIX')
        self.assertTrue(cycles.use_denoising)

    def test_supported_cpu_oidn_is_unchanged(self):
        result, cycles = self.policy(True)
        self.assertEqual(result['effectivePolicy'], 'preview')
        self.assertEqual(cycles.denoiser, 'OPENIMAGEDENOISE')
        self.assertEqual(cycles.denoising_quality, 'FAST')
        self.assertTrue(cycles.use_denoising)

    def test_authored_settings_and_compositor_are_not_silently_changed(self):
        for requested, nodes in [('preserve', []), ('final', ['Authored denoise'])]:
            result, cycles = self.policy(False, requested=requested, nodes=nodes)
            self.assertEqual(result['effectivePolicy'], 'preserve')
            self.assertTrue(cycles.use_denoising)


BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')


@unittest.skipUnless(BLENDER, 'Set BLENDER_EXECUTABLE for live denoiser test')
class DenoiseCapabilityLiveTests(unittest.TestCase):
    def test_preview_renders_with_or_without_compiled_oidn(self):
        with tempfile.TemporaryDirectory(prefix='bas-oidn-build-') as temp:
            root = Path(temp)
            setup = root / 'setup.py'
            blend = root / 'fixture.blend'
            setup.write_text("""import bpy, _cycles, json
from pathlib import Path
s=bpy.context.scene
s.render.engine='CYCLES'
s.cycles.use_denoising=False
s.render.resolution_x=s.render.resolution_y=128
s.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=""" + repr(str(blend)) + ")\nPath(" + repr(str(root/'capability.json')) + ").write_text(json.dumps(bool(_cycles.with_openimagedenoise)))\n")
            subprocess.run([BLENDER, '--background', '--factory-startup', '--disable-autoexec',
                            '--python-exit-code', '1', '--python', str(setup)],
                           check=True, capture_output=True, timeout=60)
            result = subprocess.run([BLENDER, '--background', '--factory-startup', '--disable-autoexec',
                '--python-exit-code', '1', '--python', str(SCRIPT), '--', '--input', str(blend),
                '--output-dir', str(root/'preview'), '--device', 'cpu', '--denoise', 'preview',
                '--samples', '1', '--max-edge', '128', '--time-limit', '2'],
                capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            report = json.loads((root/'preview/render-manifest.json').read_text())
            self.assertEqual(report['status'], 'complete')
            self.assertEqual(report['denoise']['effectivePolicy'],
                'preview' if json.loads((root/'capability.json').read_text()) else 'off')
            self.assertTrue(Path(report['renders'][0]['path']).is_file())


if __name__ == '__main__':
    unittest.main()
