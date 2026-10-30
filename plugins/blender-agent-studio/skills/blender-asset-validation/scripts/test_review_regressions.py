"""Live Blender regressions for instance framing and shared surface evaluation."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
try:
    import bpy
except ModuleNotFoundError as error:
    if error.name != "bpy":
        raise
    bpy = None
if bpy is not None:
    import render_evidence as render
    import inspect_attachments as attachments


@unittest.skipIf(bpy is None, "requires Blender Python")
class ReviewRegressions(unittest.TestCase):
    def setUp(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)

    def test_excluded_source_collection_instances_use_instance_transforms(self):
        source = bpy.data.collections.new("Source")
        bpy.context.scene.collection.children.link(source)
        bpy.ops.mesh.primitive_cube_add(size=2)
        cube = bpy.context.object
        for collection in list(cube.users_collection):
            collection.objects.unlink(cube)
        source.objects.link(cube)
        bpy.context.view_layer.layer_collection.children[source.name].exclude = True
        for x in (10, 20):
            instance = bpy.data.objects.new(f"Instance{x}", None)
            instance.instance_type = "COLLECTION"
            instance.instance_collection = source
            instance.location.x = x
            bpy.context.scene.collection.objects.link(instance)
        bpy.context.view_layer.update()
        low, high = render.scene_bounds()
        self.assertAlmostEqual(low.x, 9)
        self.assertAlmostEqual(high.x, 21)
        bpy.data.objects["Instance20"].hide_render = True
        bpy.context.view_layer.update()
        low, high = render.scene_bounds()
        self.assertAlmostEqual(high.x, 11)

    def test_hidden_ancestor_does_not_expand_bounds(self):
        bpy.ops.mesh.primitive_cube_add(size=2)
        hidden = bpy.data.collections.new("Hidden")
        bpy.context.scene.collection.children.link(hidden)
        hidden.hide_render = True
        bpy.ops.mesh.primitive_cube_add(size=100)
        helper = bpy.context.object
        for collection in list(helper.users_collection):
            collection.objects.unlink(helper)
        hidden.objects.link(helper)
        bpy.context.view_layer.update()
        low, high = render.scene_bounds()
        self.assertAlmostEqual(high.x - low.x, 2)

    def test_surface_topology_is_computed_once_per_object_and_frame(self):
        bpy.ops.mesh.primitive_cube_add(size=2)
        obj = bpy.context.object
        specs = [{"id": str(i), "objectName": obj.name, "vertexIndices": [i]} for i in range(8)]
        with patch.object(attachments, "topology", wraps=attachments.topology) as signature:
            cache = {}
            bindings = [attachments.bind(spec, cache) for spec in specs]
            self.assertEqual(signature.call_count, 1)
            for frame in (1, 2):
                bpy.context.scene.frame_set(frame)
                report = attachments.sample(bindings)
                self.assertEqual([a["id"] for a in report["objects"]], ["bas:surface:" + str(i) for i in range(8)])
                for anchor, vertex in zip(report["objects"], obj.data.vertices):
                    self.assertEqual([row[3] for row in anchor["world_matrix"][:3]], list(vertex.co))
            self.assertEqual(signature.call_count, 3)
            obj.data.vertices.add(1)
            obj.data.update()
            bpy.context.view_layer.update()
            with self.assertRaisesRegex(ValueError, "topology changed"):
                attachments.sample(bindings)


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0]])
