"""Exercise the setup fixture with and without Cycles, without requiring Blender."""
import json
from pathlib import Path
import runpy
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

SCRIPT = Path(__file__).with_name('setup-probe.py')


class SetupProbeTests(unittest.TestCase):
    def run_probe(self, render):
        bpy = MagicMock()
        bpy.app.version_string = 'test Blender'
        # A Cycles-free build has neither this engine nor scene.cycles.
        scene = SimpleNamespace(render=SimpleNamespace() if render else object())
        if render:
            scene.cycles = SimpleNamespace()
            scene.render.image_settings = SimpleNamespace()
        bpy.context.scene = scene
        bpy.data.images.load.return_value.size = (128, 128)
        with tempfile.TemporaryDirectory() as output:
            args = ['blender', '--', output] + ([] if render else ['--skip-render'])
            with patch.dict(sys.modules, {'bpy': bpy}), patch.object(sys, 'argv', args):
                runpy.run_path(str(SCRIPT), run_name='__main__')
            report = json.loads((Path(output) / 'probe.json').read_text())
            bpy.ops.wm.save_as_mainfile.assert_called_once_with(filepath=str(Path(output) / 'setup-check.blend'))
            bpy.ops.wm.open_mainfile.assert_called_once_with(filepath=str(Path(output) / 'setup-check.blend'), use_scripts=False)
        return bpy, scene, report

    def test_skip_render_saves_and_reopens_without_cycles(self):
        bpy, scene, report = self.run_probe(render=False)
        self.assertEqual(report['checks'], ['python', 'save', 'reopen'])
        self.assertFalse(hasattr(scene, 'cycles'))
        bpy.ops.render.render.assert_not_called()
        bpy.data.images.load.assert_not_called()

    def test_render_keeps_bounded_cpu_settings_and_checks_image(self):
        bpy, scene, report = self.run_probe(render=True)
        self.assertEqual(report['checks'], ['python', 'save', 'reopen', 'cpu-render'])
        self.assertEqual(scene.render.engine, 'CYCLES')
        self.assertEqual(scene.cycles.device, 'CPU')
        self.assertEqual(scene.cycles.samples, 4)
        self.assertEqual(scene.cycles.time_limit, 15)
        self.assertFalse(scene.cycles.use_denoising)
        self.assertEqual(scene.render.threads, 2)
        self.assertEqual((scene.render.resolution_x, scene.render.resolution_y), (128, 128))
        bpy.ops.render.render.assert_called_once_with(write_still=True)
        bpy.data.images.load.assert_called_once()

    def test_eevee_mode_only_reopens_the_fixture_and_renders_small(self):
        bpy = MagicMock()
        engines = [SimpleNamespace(identifier=name) for name in ('CYCLES', 'BLENDER_EEVEE')]
        scene = SimpleNamespace(render=SimpleNamespace(
            bl_rna=SimpleNamespace(properties={'engine': SimpleNamespace(enum_items=engines)})))
        bpy.context.scene = scene
        with tempfile.TemporaryDirectory() as output:
            args = ['blender', '--', output, '--eevee']
            with patch.dict(sys.modules, {'bpy': bpy}), patch.object(sys, 'argv', args), \
                    self.assertRaises(SystemExit) as exit:
                runpy.run_path(str(SCRIPT), run_name='__main__')
            self.assertEqual(exit.exception.code, 0)
            bpy.ops.wm.open_mainfile.assert_called_once_with(filepath=str(Path(output) / 'setup-check.blend'), use_scripts=False)
            self.assertFalse((Path(output) / 'probe.json').exists())
            self.assertEqual(scene.render.filepath, str(Path(output) / 'eevee-preview.png'))
        bpy.ops.wm.save_as_mainfile.assert_not_called()
        self.assertEqual(scene.render.engine, 'BLENDER_EEVEE')
        self.assertEqual((scene.render.resolution_x, scene.render.resolution_y), (64, 64))
        bpy.ops.render.render.assert_called_once_with(write_still=True)


if __name__ == '__main__':
    unittest.main()
