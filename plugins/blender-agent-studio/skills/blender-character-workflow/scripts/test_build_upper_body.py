"""Run with Blender: blender -b --python test_build_upper_body.py."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
try:
    import bpy
    import bmesh
    from build_upper_body import create_upper_body
except ImportError:
    bpy = None


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

    def test_region_groups_and_validation(self):
        obj = create_upper_body()
        for side in ("L", "R"):
            group = obj.vertex_groups[f"wrist.{side}"]
            self.assertEqual(sum(any(g.group == group.index for g in v.groups) for v in obj.data.vertices), 10)
        for kwargs in ({"scale": 0}, {"width": float("nan")}, {"arm_drop": 90}, {"subdivision": 3}, {"subdivision": 1.0}, {"subdivision": True}):
            with self.assertRaises(ValueError): create_upper_body(**kwargs)


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0]])
