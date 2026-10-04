import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')
SCRIPT = Path(__file__).with_name('render_scene.py')


@unittest.skipUnless(BLENDER, 'Set BLENDER_EXECUTABLE for Blender policy integration tests')
class DenoisePolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='bas-denoise-')
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def create_fixture(self, compositor=False, nested=False, muted=False, compositing=True):
        blend = self.root / ('compositor.blend' if compositor else 'plain.blend')
        setup = self.root / ('compositor.py' if compositor else 'plain.py')
        compositor_setup = """
s.use_nodes=True
tree=bpy.data.node_groups.new('Authored compositor', 'CompositorNodeTree')
s.compositing_node_group=tree
layers=tree.nodes.new('CompositorNodeRLayers')
denoise=tree.nodes.new('CompositorNodeDenoise')
denoise.name='Authored compositor denoise'
tree.links.new(layers.outputs['Image'], denoise.inputs['Image'])
""" if compositor else ''
        if compositor and nested:
            compositor_setup += """
child=bpy.data.node_groups.new('Nested compositor', 'CompositorNodeTree')
child_denoise=child.nodes.new('CompositorNodeDenoise')
child_denoise.name='Nested denoise'
group=tree.nodes.new('CompositorNodeGroup')
group.node_tree=child
"""
        if compositor and muted:
            compositor_setup += "\ndenoise.mute=True\n"
        if compositor and not compositing:
            compositor_setup += "\ns.render.use_compositing=False\n"
        setup.write_text("""import bpy
s=bpy.context.scene
s.render.engine='CYCLES'
s.cycles.use_denoising=False
s.cycles.denoiser='OPENIMAGEDENOISE'
s.cycles.denoising_quality='BALANCED'
s.cycles.denoising_prefilter='NONE'
s.render.resolution_x=64
s.render.resolution_y=64
s.render.resolution_percentage=100
""" + compositor_setup + "\nbpy.ops.wm.save_as_mainfile(filepath=" + repr(str(blend)) + ")\n")
        subprocess.run([BLENDER, '--background', '--factory-startup', '--python-exit-code', '1',
                        '--python', str(setup)], check=True, capture_output=True, text=True, timeout=60)
        return blend

    def invoke(self, blend, name, policy, device='cpu'):
        result = subprocess.run([
            BLENDER, '--background', '--factory-startup', '--disable-autoexec', '--python-exit-code', '1',
            '--python', str(SCRIPT), '--', '--input', str(blend), '--output-dir', str(self.root / name),
            '--device', device, '--denoise', policy, '--max-edge', '128', '--samples', '1', '--time-limit', '1'],
            capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads((self.root / name / 'render-manifest.json').read_text())['denoise']

    def probe_policy(self, blend, name, policy):
        """Exercise policy RNA without requiring a complete compositor output."""
        result_path = self.root / f'{name}.json'
        probe = self.root / f'{name}.py'
        probe.write_text("""import bpy, importlib.util, json
spec=importlib.util.spec_from_file_location('render_scene', """ + repr(str(SCRIPT)) + """)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
bpy.ops.wm.open_mainfile(filepath=""" + repr(str(blend)) + """)
scene=bpy.context.scene
device=module.configure_device(scene, 'cpu')
policy=module.configure_denoising(scene, """ + repr(policy) + """, device)
open(""" + repr(str(result_path)) + """, 'w', encoding='utf-8').write(json.dumps(policy))
""")
        result = subprocess.run([BLENDER, '--background', '--factory-startup', '--disable-autoexec',
                                 '--python-exit-code', '1', '--python', str(probe)],
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result_path.read_text())

    def test_preview_cpu_falls_back_to_fast_oidn(self):
        policy = self.invoke(self.create_fixture(), 'preview', 'preview')
        self.assertEqual(policy['requestedPolicy'], 'preview')
        self.assertEqual(policy['effectivePolicy'], 'preview')
        self.assertEqual(policy['denoiser'], 'OPENIMAGEDENOISE')
        self.assertEqual(policy['quality'], 'FAST')
        self.assertEqual(policy['prefilter'], 'FAST')
        self.assertFalse(policy['gpu'])
        self.assertIn('using CPU OIDN', policy['decisionReason'])

    def test_final_uses_high_accurate_cpu_oidn(self):
        policy = self.invoke(self.create_fixture(), 'final', 'final')
        self.assertEqual(policy['denoiser'], 'OPENIMAGEDENOISE')
        self.assertEqual(policy['quality'], 'HIGH')
        self.assertEqual(policy['prefilter'], 'ACCURATE')
        self.assertFalse(policy['gpu'])

    def test_preview_uses_gpu_oidn_when_cycles_reports_an_auto_discovered_capability(self):
        policy = self.invoke(self.create_fixture(), 'preview-auto', 'preview', device='auto')
        # The test runs on CPU-only machines too. On the validated RTX fixture,
        # this exercises the preference API and asserts the GPU path directly.
        if policy['gpu']:
            self.assertIn(policy['denoiser'], ['OPENIMAGEDENOISE', 'OPTIX'])
            if policy['denoiser'] == 'OPENIMAGEDENOISE':
                self.assertEqual(policy['quality'], 'FAST')
                self.assertEqual(policy['prefilter'], 'FAST')
            self.assertIn('GPU', policy['decisionReason'])
        else:
            self.assertIn('CPU OIDN', policy['decisionReason'])

    def test_final_prefers_supported_gpu_denoising(self):
        policy = self.invoke(self.create_fixture(), 'final-auto', 'final', device='auto')
        if policy['gpu']:
            self.assertIn(policy['denoiser'], ['OPENIMAGEDENOISE', 'OPTIX'])
            self.assertIn('GPU', policy['decisionReason'])
            if policy['denoiser'] == 'OPENIMAGEDENOISE':
                self.assertEqual(policy['quality'], 'HIGH')
                self.assertEqual(policy['prefilter'], 'ACCURATE')
        else:
            self.assertIn('CPU OIDN', policy['decisionReason'])

    def test_preserve_keeps_authored_settings(self):
        policy = self.invoke(self.create_fixture(), 'preserve', 'preserve')
        self.assertEqual(policy['effectivePolicy'], 'preserve')
        self.assertFalse(policy['renderDenoisingEnabled'])
        self.assertEqual(policy['quality'], 'BALANCED')
        self.assertEqual(policy['prefilter'], 'NONE')

    def test_automatic_policy_preserves_active_compositor_denoise(self):
        policy = self.probe_policy(self.create_fixture(compositor=True), 'compositor', 'final')
        self.assertEqual(policy['effectivePolicy'], 'preserve')
        self.assertFalse(policy['renderDenoisingEnabled'])
        self.assertEqual(policy['compositorDenoiseNodes'], ['Authored compositor/Authored compositor denoise'])
        self.assertIn('double-filter', policy['decisionReason'])

    def test_off_disables_render_denoising_but_reports_compositor_unchanged(self):
        policy = self.probe_policy(self.create_fixture(compositor=True), 'off', 'off')
        self.assertEqual(policy['effectivePolicy'], 'off')
        self.assertFalse(policy['renderDenoisingEnabled'])
        self.assertIn('compositor denoising is unchanged', policy['decisionReason'])

    def test_mute_disabled_compositing_and_nested_nodes_follow_compositor_policy(self):
        muted = self.probe_policy(self.create_fixture(compositor=True, muted=True), 'muted', 'final')
        self.assertEqual(muted['effectivePolicy'], 'final')
        disabled = self.probe_policy(self.create_fixture(compositor=True, compositing=False), 'disabled', 'final')
        self.assertEqual(disabled['effectivePolicy'], 'final')
        nested = self.probe_policy(self.create_fixture(compositor=True, nested=True), 'nested', 'final')
        self.assertEqual(nested['effectivePolicy'], 'preserve')
        self.assertIn('Authored compositor/Group/Nested denoise', nested['compositorDenoiseNodes'])


if __name__ == '__main__':
    unittest.main()
