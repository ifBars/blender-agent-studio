import math
import unittest
from lathe_mesh import lathe_mesh


class LatheMeshTests(unittest.TestCase):
    def test_disk_and_hollow_bowl_have_shared_poles_and_closed_edges(self):
        for profile in (
            [(0, .18), (.22, .18), (.225, .2), (0, .2)],
            [(0, 0), (.08, 0), (.16, .12), (.145, .12), (.07, .015), (0, .015)],
        ):
            vertices, faces = lathe_mesh(profile, 32)
            self.assertEqual(len(vertices), (len(profile) - 2) * 32 + 2)
            edges = {}
            for face in faces:
                self.assertEqual(len(face), len(set(face)))
                for a, b in zip(face, face[1:] + face[:1]):
                    self.assertGreater(sum((x-y)**2 for x,y in zip(vertices[a],vertices[b])), 1e-20)
                    key = tuple(sorted((a,b)))
                    edges[key] = edges.get(key,0) + 1
            self.assertTrue(all(count == 2 for count in edges.values()))
            self.assertEqual(len(set(vertices)), len(vertices))

    def test_rejects_profiles_that_cannot_define_finite_surface(self):
        for profile in ([(0,0),(0,1)], [(1,0),(1,0)], [(-1,0),(1,1)], [(1,0),(1,math.inf)], [(1,0),(math.nan,1)]):
            with self.assertRaises(ValueError):
                lathe_mesh(profile)
        with self.assertRaises(ValueError):
            lathe_mesh([(1,0),(1,1)],segments=2)

    def test_open_tube_has_only_requested_end_caps(self):
        profile = [(1,0),(1,1)]
        self.assertEqual(len(lathe_mesh(profile,8,False,False)[1]),8)
        self.assertEqual(len(lathe_mesh(profile,8,True,False)[1]),9)
        self.assertEqual(len(lathe_mesh(profile,8,True,True)[1]),10)


if __name__ == '__main__':
    unittest.main()
