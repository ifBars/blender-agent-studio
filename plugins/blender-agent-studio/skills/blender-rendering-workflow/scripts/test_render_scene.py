import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

BLENDER = os.environ.get('BLENDER_EXECUTABLE') or shutil.which('blender')
SCRIPT = Path(__file__).with_name('render_scene.py')


@unittest.skipUnless(BLENDER, 'Set BLENDER_EXECUTABLE for authored-render integration tests')
class AuthoredRenderTests(unittest.TestCase):
    def test_preserves_authored_scene_reports_dependencies_and_rejects_stale_output(self):
        with tempfile.TemporaryDirectory(prefix='bas-authored-') as temp:
            root = Path(temp)
            blend = root / 'fixture.blend'
            setup = root / 'setup.py'
            setup.write_text('''import bpy
from pathlib import Path
s=bpy.context.scene
s.render.engine='CYCLES'
s.cycles.samples=2
s.cycles.use_denoising=False
s.render.resolution_x=256
s.render.resolution_y=128
s.render.resolution_percentage=100
s.view_settings.exposure=-0.75
s.camera.name='Fixture camera with spaces'
s.world.name='Preserved world'
s.render.film_transparent=True
image=bpy.data.images.new('Missing image',width=1,height=1)
image.source='FILE'
image.filepath='//absent-texture.png'
image.use_fake_user=True
if hasattr(s,'compositing_node_group'):
    tree=bpy.data.node_groups.new('Fixture compositor','CompositorNodeTree')
    s.compositing_node_group=tree
    tree.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
    layers=tree.nodes.new('CompositorNodeRLayers')
    output=tree.nodes.new('NodeGroupOutput')
    tree.links.new(layers.outputs['Image'],output.inputs['Image'])
    external=tree.nodes.new('CompositorNodeOutputFile')
    external.directory='//unexpected-output'
    tree.links.new(layers.outputs['Image'],external.inputs[0])
bpy.ops.wm.save_as_mainfile(filepath=''' + repr(str(blend)) + ')\n')
            subprocess.run([BLENDER, '--background', '--factory-startup', '--python-exit-code', '1', '--python', str(setup)], check=True, capture_output=True, timeout=60)
            digest=hashlib.sha256(blend.read_bytes()).hexdigest()
            def invoke(folder, *extra):
                return subprocess.run([BLENDER, '--background', '--factory-startup', '--disable-autoexec', '--python-exit-code', '1', '--python', str(SCRIPT), '--', '--input', str(blend), '--output-dir', str(root/folder), *extra], capture_output=True, text=True, timeout=90)
            result=invoke('render', '--max-edge', '128', '--samples', '1', '--device', 'cpu', '--camera', 'Fixture camera with spaces')
            self.assertEqual(result.returncode, 0, result.stdout+result.stderr)
            manifest=json.loads((root/'render/render-manifest.json').read_text())
            self.assertEqual(manifest['status'], 'complete')
            self.assertEqual(manifest['preflight']['world'], 'Preserved world')
            self.assertEqual(manifest['preflight']['colorManagement']['exposure'], -.75)
            self.assertEqual(manifest['effective']['resolution'], [128,64])
            self.assertEqual(manifest['renders'][0]['camera'], 'Fixture camera with spaces')
            self.assertEqual(len(manifest['preflight']['missingDependencies']), 1)
            self.assertFalse((root/'unexpected-output').exists())
            if manifest['blenderVersion'].startswith('5.'):
                self.assertEqual(len(manifest['mutedFileOutputs']), 1)
            self.assertEqual(hashlib.sha256(blend.read_bytes()).hexdigest(), digest)
            self.assertTrue(Path(manifest['renders'][0]['path']).is_file())
            self.assertNotEqual(invoke('render').returncode, 0)
            self.assertNotEqual(invoke('bad-camera', '--camera', 'Nonexistent').returncode, 0)
            failed=json.loads((root/'bad-camera/render-manifest.json').read_text())
            self.assertEqual(failed['status'], 'failed')
            self.assertEqual(failed['renders'], [])
            self.assertEqual(invoke('inspect', '--inspect-only').returncode, 0)
            self.assertFalse(list((root/'inspect').glob('*.png')))


if __name__ == '__main__': unittest.main()
