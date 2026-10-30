"""Run with Blender: blender -b --python test_build_upper_body.py."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
try:
    import bpy
    import bmesh
except ModuleNotFoundError as error:
    if error.name not in {"bpy", "bmesh"}:
        raise
    bpy = None

if bpy is not None:
    from build_upper_body import create_upper_body


@unittest.skipIf(bpy is None, "requires Blender Python")
class UpperBodyTests(unittest.TestCase):
    def tearDown(self):
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj, do_unlink=True)

    def test_connected_cage_has_only_four_intended_openings(self):
        obj = create_upper_body(subdivision=0)
        bm = bmesh.new(); bm.from_mesh(obj.data)
        self.assertFalse(any(len(edge.link_faces) > 2 for edge in bm.edges))
        # Four closed boundary loops: neck, waist, and two wrists.
        boundary = {v for e in bm.edges if e.is_boundary for v in e.verts}
        self.assertTrue(all(sum(e.is_boundary for e in v.link_edges) == 2 for v in boundary))
        loops = 0
        while boundary:
            loops += 1; queue = [boundary.pop()]
            while queue:
                v = queue.pop()
                for e in v.link_edges:
                    if e.is_boundary:
                        other = e.other_vert(v)
                        if other in boundary:
                            boundary.remove(other); queue.append(other)
        self.assertEqual(loops, 4)
        bm.verts.ensure_lookup_table(); seen = {bm.verts[0]}; queue = list(seen)
        while queue:
            for e in queue.pop().link_edges:
                for v in e.verts:
                    if v not in seen: seen.add(v); queue.append(v)
        self.assertEqual(len(seen), len(bm.verts))
        self.assertTrue(all(f.calc_area() > 1e-8 for f in bm.faces))
        bm.free()

    def test_symmetry_and_scale(self):
        a = create_upper_body(subdivision=0)
        coords = {tuple(round(c, 6) for c in v.co) for v in a.data.vertices}
        self.assertTrue(all((-x, y, z) in coords for x, y, z in coords))
        b = create_upper_body(scale=2, subdivision=0)
        self.assertTrue(all((v.co * 2 - w.co).length < 1e-6 for v, w in zip(a.data.vertices, b.data.vertices)))

    def test_arm_sections_do_not_inherit_rectangular_opening_spacing(self):
        # A closed/manifold cage can still have two enormous angular gaps at
        # every arm section. They flatten the profile before any skinning.
        import math
        from mathutils import Vector
        for drop in (15, 40, 65):
            obj = create_upper_body(arm_drop=drop, subdivision=0)
            up = Vector((math.sin(math.radians(drop)), 0,
                         math.cos(math.radians(drop))))
            for start in range(80, 150, 10):
                coords = [v.co for v in obj.data.vertices[start:start + 10]]
                center = sum(coords, Vector()) / len(coords)
                # Normalize each axis to eliminate the intentional ellipse.
                y_radius = max(abs((p-center).y) for p in coords)
                z_radius = max(abs((p-center).dot(up)) for p in coords)
                angles = sorted(math.atan2((p-center).dot(up)/z_radius,
                                           (p-center).y/y_radius) for p in coords)
                gaps = [(angles[(i+1) % 10]-angles[i]) % math.tau
                        for i in range(10)]
                self.assertLess(max(gaps), math.radians(40))
                self.assertGreater(min(gaps), math.radians(32))

    def test_proportion_matrix_has_no_nonadjacent_surface_intersections(self):
        from mathutils.bvhtree import BVHTree
        for width in (.7, 1., 1.5):
            for depth in (.7, 1., 1.5):
                for drop in (15, 40, 65):
                    for subdivision in (0, 1, 2):
                        obj = create_upper_body(width=width, depth=depth,
                                                arm_drop=drop, subdivision=subdivision)
                        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
                        mesh = evaluated.to_mesh()
                        try:
                            polygons = [tuple(p.vertices) for p in mesh.polygons]
                            tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], polygons)
                            intersections = [(a, b) for a, b in tree.overlap(tree)
                                             if a < b and not set(polygons[a]).intersection(polygons[b])]
                            self.assertEqual(intersections, [], (width, depth, drop, subdivision))
                        finally:
                            evaluated.to_mesh_clear()
                            bpy.data.objects.remove(obj, do_unlink=True)

    def test_regularized_wrist_preserves_previous_endpoint_envelope(self):
        # Uniform angular spacing should not inflate an existing hand join.
        for scale in (1., 2.):
            obj = create_upper_body(scale=scale, subdivision=0)
            for side in ("L", "R"):
                group = obj.vertex_groups[f"wrist.{side}"]
                ys = [v.co.y for v in obj.data.vertices
                      if any(g.group == group.index for g in v.groups)]
                self.assertAlmostEqual((max(ys)-min(ys))/scale, .0411, delta=.0002)

    def test_region_groups_and_validation(self):
        obj = create_upper_body()
        for side in ("L", "R"):
            group = obj.vertex_groups[f"wrist.{side}"]
            self.assertEqual(sum(any(g.group == group.index for g in v.groups) for v in obj.data.vertices), 10)
        for kwargs in ({"scale": 0}, {"width": float("nan")}, {"arm_drop": 90}, {"subdivision": 3}, {"subdivision": 1.0}, {"subdivision": True}):
            with self.assertRaises(ValueError): create_upper_body(**kwargs)


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0]])
