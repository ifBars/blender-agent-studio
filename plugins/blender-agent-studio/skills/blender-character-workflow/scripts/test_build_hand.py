"""Run: blender -b --python test_build_hand.py (no third-party packages)."""
import os
import math
import sys
import unittest

try:
    import bmesh
    import bpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
except ModuleNotFoundError:
    bpy = None

if bpy is not None:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from build_hand import create_hand, bridge_wrist_loops


@unittest.skipUnless(bpy is not None, 'Requires Blender Python (bpy/bmesh)')
class HandTests(unittest.TestCase):
    def setUp(self):
        self.objects = []

    def tearDown(self):
        for obj in self.objects:
            mesh = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.meshes.remove(mesh)

    def hand(self, **kwargs):
        obj = create_hand(**kwargs)
        self.objects.append(obj)
        return obj

    def group_ids(self, obj, name):
        index = obj.vertex_groups[name].index
        return {v.index for v in obj.data.vertices
                if any(g.group == index for g in v.groups)}

    def test_connected_closed_manifold(self):
        for mirror in (False, True):
            obj = self.hand(mirror=mirror, subdivision=0)
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bm.verts.ensure_lookup_table()
            self.assertTrue(all(e.is_manifold and e.is_contiguous for e in bm.edges))
            self.assertTrue(all(f.calc_area() > 1e-8 for f in bm.faces))
            self.assertGreater(bm.calc_volume(signed=True), 0)
            visited, pending = set(), [bm.verts[0]]
            while pending:
                vertex = pending.pop()
                if vertex in visited:
                    continue
                visited.add(vertex)
                pending.extend(e.other_vert(vertex) for e in vertex.link_edges)
            self.assertEqual(len(visited), len(bm.verts))
            self.assertEqual(len(bm.verts) - len(bm.edges) + len(bm.faces), 2)
            bm.free()

    def test_five_separate_distal_caps_and_relative_lengths(self):
        obj = self.hand(subdivision=0)
        tips = {}
        polygons = {frozenset(p.vertices) for p in obj.data.polygons}
        all_ids = set()
        for label in ('thumb', 'index', 'middle', 'ring', 'little'):
            ids = self.group_ids(obj, label + '_tip')
            self.assertEqual(len(ids), 4)
            self.assertIn(frozenset(ids), polygons)
            self.assertFalse(ids & all_ids)
            all_ids.update(ids)
            tips[label] = sum((obj.data.vertices[i].co for i in ids), Vector()) / 4
        self.assertGreater(tips['middle'].y, tips['index'].y)
        self.assertGreater(tips['ring'].y, tips['little'].y)
        self.assertLess(tips['thumb'].x, -1.5)
        self.assertLess(tips['thumb'].z, -.25)
        self.assertLess(tips['thumb'].y, tips['little'].y)

    def test_mirror_geometry_and_normals(self):
        a, b = self.hand(subdivision=0), self.hand(mirror=True, subdivision=0)
        self.assertEqual(len(a.data.vertices), len(b.data.vertices))
        for va, vb in zip(a.data.vertices, b.data.vertices):
            self.assertLess((Vector((-va.co.x, va.co.y, va.co.z)) - vb.co).length, 1e-6)
        for pa, pb in zip(a.data.polygons, b.data.polygons):
            expected = Vector((-pa.normal.x, pa.normal.y, pa.normal.z))
            self.assertGreater(expected.dot(pb.normal), .999)

    def test_unequal_wrist_loops_make_one_closed_surface(self):
        obj = self.hand(subdivision=0)
        wrist = self.group_ids(obj, 'wrist')
        vertices = [tuple(v.co) for v in obj.data.vertices]
        faces = [tuple(p.vertices) for p in obj.data.polygons
                 if not set(p.vertices).issubset(wrist)]
        hand_loop = sorted(wrist, key=lambda i: math.atan2(vertices[i][2], vertices[i][0]))
        arm_loop = []
        for i in range(10):
            angle = -math.pi + i * math.tau / 10
            arm_loop.append(len(vertices))
            vertices.append((.60 * math.cos(angle), -.3, .145 * math.sin(angle)))
        faces.extend(bridge_wrist_loops(arm_loop, hand_loop))
        faces.append(tuple(reversed(arm_loop)))
        me = bpy.data.meshes.new('Joined wrist test')
        me.from_pydata(vertices, [], faces); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        self.assertTrue(all(e.is_manifold for e in bm.edges))
        self.assertTrue(all(f.calc_area() > 1e-8 for f in bm.faces))
        bm.verts.ensure_lookup_table()
        seen = {bm.verts[0]}; pending = list(seen)
        while pending:
            for edge in pending.pop().link_edges:
                for v in edge.verts:
                    if v not in seen: seen.add(v); pending.append(v)
        self.assertEqual(len(seen), len(bm.verts))
        bm.free(); bpy.data.meshes.remove(me)
        for a, h in [([0, 1], [3, 4, 5]), ([0, 1, 1], [3, 4, 5]),
                     ([0, 1, 2], [2, 3, 4]), ([False, 1, 2], [3, 4, 5])]:
            with self.assertRaises(ValueError): bridge_wrist_loops(a, h)

    def test_short_digits_do_not_fold_through_palm(self):
        # Closed-manifold topology alone missed thumb/palm intersections,
        # including on the default unsubdivided cage. Test evaluated surfaces
        # too: subdivision may hide a cage defect or introduce a new fold.
        for length in (.1, .2, .3, .4, .5, .6, .7, 1.0, 1.5, 2.0):
            for subdivision in (0, 1, 2):
                for mirror in (False, True):
                    with self.subTest(length=length, subdivision=subdivision, mirror=mirror):
                        obj = self.hand(finger_length=length, subdivision=subdivision,
                                        mirror=mirror)
                        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
                        mesh = evaluated.to_mesh()
                        try:
                            polygons = [tuple(p.vertices) for p in mesh.polygons]
                            tree = BVHTree.FromPolygons(
                                [v.co.copy() for v in mesh.vertices], polygons)
                            crossings = [(a, b) for a, b in tree.overlap(tree)
                                         if a < b and not set(polygons[a]) & set(polygons[b])]
                            self.assertEqual(crossings, [])
                        finally:
                            evaluated.to_mesh_clear()

    def test_transform_and_validation(self):
        obj = self.hand(scale=.12, location=(1, 2, 3), rotation=(.2, .3, .4))
        self.assertLess((obj.location - Vector((1, 2, 3))).length, 1e-6)
        self.assertEqual(obj.modifiers[0].levels, 1)
        self.assertLess(max(v.co.y for v in obj.data.vertices), .5)
        for kwargs in ({'scale': 0}, {'palm_width': -1}, {'thickness': float('nan')},
                       {'subdivision': 3}, {'subdivision': True}, {'subdivision': 1.0}):
            with self.assertRaises(ValueError):
                create_hand(**kwargs)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(HandTests))
    if not result.wasSuccessful():
        sys.exit(1)
