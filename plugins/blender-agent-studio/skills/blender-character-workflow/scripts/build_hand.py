"""Small connected, stylized hand cage; run/import with Blender's Python.

Local +Y runs from wrist to fingers, -Z is the palm, and -X is the thumb.
Dimensions are approximately 2 units across the palm and 3.8 wrist to tip.
Use ``scale`` for world size; proportion arguments are positive multipliers.
The capped wrist group is a boundary to replace when joining to an arm.
This is an editable starting cage, not an anatomical or deformation guarantee.
"""
import math

import bmesh
import bpy
from mathutils import Vector


def create_hand(name="Hand", *, scale=1.0, palm_width=1.0,
                palm_length=1.0, finger_length=1.0, thickness=1.0,
                mirror=False, location=(0, 0, 0), rotation=(0, 0, 0),
                subdivision=1):
    """Return a linked mesh object with shared palm/digit boundary vertices.

    ``rotation`` is Euler XYZ in radians. ``mirror`` reflects local X in the
    mesh, preserving outward normals. Subdivision is optional/non-destructive.
    Vertex groups are overlapping construction metadata, NOT deform weights:
    wrist, index/middle/ring/little/thumb and each *_tip.
    ``*_tip`` groups mark the four cage vertices of each closed distal cap.
    Subdivision changes evaluated topology; build/normalize rig weights separately.
    """
    values = (scale, palm_width, palm_length, finger_length, thickness)
    if any(not math.isfinite(v) or v <= 0 for v in values):
        raise ValueError("Scale and proportion multipliers must be finite and positive")
    if type(subdivision) is not int or subdivision not in (0, 1, 2):
        raise ValueError("subdivision must be 0, 1 or 2")
    verts, faces, groups = [], [], {}

    def vertex(p):
        verts.append(tuple(p))
        return len(verts) - 1

    def bridge(a, b):
        for i in range(4):
            j = (i + 1) % 4
            faces.append((a[i], a[j], b[j], b[i]))

    # Paired finger openings separated by genuine, narrow interdigital webs.
    xs = [-1.0, -.55, -.48, .02, .09, .56, .63, 1.02]
    distal = [1.86, 1.92, 2.0, 2.02, 1.98, 1.91, 1.73, 1.68]
    ys, widths, depths = [0, .48, 1.16, None], [.60, .84, 1.0, 1.0], [.145, .22, .23, .17]
    grid = {}
    for row in range(4):
        for col, x in enumerate(xs):
            y = distal[col] if row == 3 else ys[row]
            # Dorsal arch and a fuller palm/thenar side; not a uniform slab.
            arch = .025 * (1 - (abs(x) / 1.05) ** 2)
            for side in (0, 1):
                z = (depths[row] + arch) * (1 if side else -1)
                if side == 0 and row in (1, 2) and col < 3:
                    z -= .055
                grid[row, col, side] = vertex((x * widths[row], y, z))
    for row in range(3):
        for col in range(7):
            for side in (0, 1):
                faces.append(tuple(grid[r, c, side] for r, c in
                                   ((row, col), (row, col + 1),
                                    (row + 1, col + 1), (row + 1, col))))
    for col in range(7):
        faces.append(tuple(grid[r, c, s] for r, c, s in
                           ((0, col, 0), (0, col + 1, 0),
                            (0, col + 1, 1), (0, col, 1))))
        if col % 2:  # Keep webs; the other four distal faces become fingers.
            faces.append((grid[3, col, 0], grid[3, col + 1, 0],
                          grid[3, col + 1, 1], grid[3, col, 1]))
    for row in range(3):
        for col in (0, 7):
            if col == 0 and row == 1:  # Uncapped side opening for the thumb.
                continue
            faces.append((grid[row, col, 0], grid[row + 1, col, 0],
                          grid[row + 1, col, 1], grid[row, col, 1]))
    groups['wrist'] = [grid[0, c, s] for c in range(8) for s in (0, 1)]

    def digit(label, root, sections):
        previous = root
        ids = list(root)
        for points in sections:
            current = [vertex(p) for p in points]
            bridge(previous, current)
            ids.extend(current)
            previous = current
        faces.append(tuple(reversed(previous)))
        groups[label], groups[label + '_tip'] = ids, previous

    lengths = [1.55, 1.76, 1.62, 1.22]
    spreads = [-.10, -.025, .07, .17]
    for number, label in enumerate(('index', 'middle', 'ring', 'little')):
        col = number * 2
        root = [grid[3, col, 0], grid[3, col + 1, 0],
                grid[3, col + 1, 1], grid[3, col, 1]]
        center = sum((Vector(verts[i]) for i in root), Vector()) / 4
        half_width = (xs[col + 1] - xs[col]) / 2
        sections = []
        length = lengths[number] * finger_length
        # Short fingers still need their first ring beyond both staggered
        # root corners. Otherwise the closed cage folds back into the palm.
        root_clearance = max(
            0.0, max(verts[i][1] for i in root) - center.y - .13 * length + .001)
        # Rings flank both joints; gentle palmward flexion increases distally.
        for t, taper in ((.13, .98), (.40, .89), (.47, .88),
                         (.70, .77), (.77, .74), (.94, .63), (1, .40)):
            cy = center.y + t * length + root_clearance
            cx = center.x + spreads[number] * t
            cz = -.035 - (.24 + number * .025) * t * t
            hw, hd = half_width * taper, .165 * taper
            sections.append([(cx - hw, cy, cz - hd), (cx + hw, cy, cz - hd),
                             (cx + hw, cy, cz + hd), (cx - hw, cy, cz + hd)])
        digit(label, root, sections)

    root = [grid[1, 0, 0], grid[2, 0, 0], grid[2, 0, 1], grid[1, 0, 1]]
    origin = sum((Vector(verts[i]) for i in root), Vector()) / 4
    axis = Vector((-.78, .60, -.24)).normalized()
    across = Vector((axis.y, -axis.x, 0)).normalized()
    depth = across.cross(axis).normalized()
    sections = []
    for t, width, thick in ((.19, .30, .22), (.42, .25, .20),
                             (.49, .245, .195), (.74, .21, .17),
                             (.82, .20, .16), (1, .14, .12)):
        c = origin + axis * (1.35 * finger_length * t)
        c.z -= .10 * t * t
        points = [c - across * width - depth * thick,
                  c + across * width - depth * thick,
                  c + across * width + depth * thick,
                  c - across * width + depth * thick]
        sections.append(points)
    # A manifold thumb can still pass through the palm. Keep every section
    # outside the outer root plane, translating all rings together so short
    # thumbs retain their ordering instead of folding into each other.
    outward_shift = max(
        0.0, max(p.x for section in sections for p in section)
        - min(verts[i][0] for i in root) + .001)
    for section in sections:
        for p in section:
            p.x -= outward_shift
    digit('thumb', root, sections)

    # Apply proportions in the cage; transform is reserved for placement.
    verts = [((-1 if mirror else 1) * x * palm_width * scale,
              y * palm_length * scale, z * thickness * scale) for x, y, z in verts]
    mesh = bpy.data.meshes.new(name + 'Cage')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location, obj.rotation_euler = location, rotation
    obj['hand_groups_are_construction_metadata'] = True
    for label, ids in groups.items():
        obj.vertex_groups.new(name=label).add(ids, 1.0, 'REPLACE')
    if subdivision:
        mod = obj.modifiers.new('Hand surface', 'SUBSURF')
        mod.levels = mod.render_levels = subdivision
    return obj


def bridge_wrist_loops(arm_loop, hand_loop):
    """Return faces joining two open, ordered loops, including unequal counts.

    Supply disjoint vertex indices in ONE mesh/rest space. Remove wrist caps
    first; start both loops on the same physical side and order both around
    the wrist in the same direction. This function does not guess alignment,
    move vertices, join objects, transfer weights, or repair intersections.
    Recalculate normals and inspect the transition before assigning skinning.
    """
    loops = (list(arm_loop), list(hand_loop))
    for loop in loops:
        if len(loop) < 3 or any(type(i) is not int or i < 0 for i in loop):
            raise ValueError("Wrist loops require at least three vertex indices")
        if len(set(loop)) != len(loop):
            raise ValueError("Wrist loop indices must be unique")
    a, h = loops
    if set(a) & set(h):
        raise ValueError("Wrist loops must be disjoint")
    faces, i, j = [], 0, 0
    while i < len(a) or j < len(h):
        ai, hj = a[i % len(a)], h[j % len(h)]
        # Integer fractions avoid floating-point corner correspondence errors.
        na, nh = (i + 1) * len(h), (j + 1) * len(a)
        if na == nh:
            faces.append((ai, a[(i + 1) % len(a)], h[(j + 1) % len(h)], hj))
            i += 1; j += 1
        elif na < nh:
            faces.append((ai, a[(i + 1) % len(a)], hj)); i += 1
        else:
            faces.append((ai, h[(j + 1) % len(h)], hj)); j += 1
    return faces
