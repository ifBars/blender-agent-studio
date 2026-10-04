"""Pure geometry for a revolved profile, sharing a single vertex at each pole.

Copy this helper into durable generation inputs when using it in a deliverable.
It returns vertices/faces for Mesh.from_pydata; it does not author materials,
apply modifiers, detect self-intersections or guarantee export readiness.
"""
import math


def lathe_mesh(profile, segments=48, cap_bottom=True, cap_top=True):
    """Revolve distinct (nonnegative radius, height) points around local Z."""
    if not isinstance(segments, int) or isinstance(segments, bool) or not 3 <= segments <= 4096:
        raise ValueError("segments must be an integer between 3 and 4096")
    points = [tuple(map(float, point)) for point in profile]
    if not 2 <= len(points) <= 256 or any(len(point) != 2 for point in points):
        raise ValueError("profile needs 2..256 radius/height pairs")
    if any(not math.isfinite(value) for point in points for value in point) or any(r < 0 for r, _ in points):
        raise ValueError("profile must have finite coordinates and nonnegative radii")
    if len(set(points)) != len(points) or any(a[0] == b[0] == 0 for a, b in zip(points, points[1:])):
        raise ValueError("duplicate points and consecutive poles cannot form a surface")
    vertices, rings, faces = [], [], []
    for radius, height in points:
        if radius == 0:
            rings.append([len(vertices)])
            vertices.append((0.0, 0.0, height))
        else:
            ring = []
            for index in range(segments):
                angle = math.tau * index / segments
                ring.append(len(vertices))
                vertices.append((radius * math.cos(angle), radius * math.sin(angle), height))
            rings.append(ring)
    for lower, upper in zip(rings, rings[1:]):
        for index in range(segments):
            next_index = (index + 1) % segments
            if len(lower) == 1:
                faces.append((lower[0], upper[next_index], upper[index]))
            elif len(upper) == 1:
                faces.append((lower[index], lower[next_index], upper[0]))
            else:
                faces.append((lower[index], lower[next_index], upper[next_index], upper[index]))
    if cap_bottom and len(rings[0]) > 1:
        faces.append(tuple(reversed(rings[0])))
    if cap_top and len(rings[-1]) > 1:
        faces.append(tuple(rings[-1]))
    return vertices, faces
