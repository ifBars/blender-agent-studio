"""A connected stylized torso/arm starting cage, not an anatomy or rig preset.

Run inside Blender. +Z is up, -Y is front; arms descend in the X/Z plane.
Adapt the supplied landmarks to the brief before clothing or detail. Open neck,
waist and wrist boundaries are intentional attachment loops. No union/remesh.
"""
import math
import bpy
from mathutils import Vector


def create_upper_body(name="UpperBody", *, scale=1.0, width=1.0, depth=1.0,
                      arm_drop=40.0, subdivision=1, location=(0, 0, 0)):
    """Build shared shoulder boundaries with region groups for local skinning.

    Defaults describe a simple 1.75 m adult blockout. `width` changes torso
    breadth, not limb length; `depth` changes torso depth. `arm_drop` is degrees
    below horizontal (15..65). Scale multiplies all coordinates, including Z.
    Return an object with wrist.L/R and torso/arm.L/R vertex groups. Groups
    identify construction regions; they are NOT deformation weights.
    """
    if not all(math.isfinite(v) and v > 0 for v in (scale, width, depth)):
        raise ValueError("scale, width and depth must be finite and positive")
    if not math.isfinite(arm_drop) or not 15 <= arm_drop <= 65:
        raise ValueError("arm_drop must be between 15 and 65 degrees")
    if type(subdivision) is not int or subdivision not in (0, 1, 2):
        raise ValueError("subdivision must be 0, 1 or 2")
    verts, faces = [], []
    # Waist, lower ribs, underarm, shoulder ridge, neck. Each arm replaces a
    # side patch between underarm and shoulder, rather than covering a cap.
    landmarks = [(0.94, .145, .100), (1.10, .145, .108),
                 (1.30, .185, .115), (1.47, .205, .105),
                 (1.535, .073, .072)]
    rings = []
    for z, rx, ry in landmarks:
        ring = []
        for i in range(16):
            a = i * math.tau / 16
            ring.append(len(verts))
            verts.append((rx * math.cos(a) * width, ry * math.sin(a) * depth, z))
        rings.append(ring)
    holes = {0: {14, 15, 0, 1}, 8: {6, 7, 8, 9}}
    for level in range(len(rings) - 1):
        for i in range(16):
            if level == 2 and any(i in arc for arc in holes.values()):
                continue
            j = (i + 1) % 16
            faces.append((rings[level][i], rings[level][j],
                          rings[level + 1][j], rings[level + 1][i]))
    groups = {"torso": list(range(len(verts)))}
    drop = math.radians(arm_drop)
    for side, center_index, sign in (("L", 0, 1), ("R", 8, -1)):
        arc = [(center_index + i) % 16 for i in range(-2, 3)]
        boundary = [rings[2][i] for i in arc] + [rings[3][i] for i in reversed(arc)]
        # Preserve the boundary's ordering and translate its angular positions
        # to elliptical arm sections. The first section stays close to chest;
        # there is no oversized deltoid sphere or capped intersecting tube.
        # The rectangular torso opening clusters its samples at the top and
        # bottom. Reusing those angles for every limb ring leaves two ~110-degree
        # gaps and a flattened front/back profile, especially during elbow bend.
        # Keep the shared opening, but distribute the ten limb samples evenly.
        angles = [-math.pi + math.pi / 10 + i * math.tau / 10
                  for i in range(10)]
        # A steep arm drop otherwise places the inside of the first ellipse
        # behind the torso opening, making a folded, self-intersecting armpit.
        clearance = max(0.0, .075 * math.sin(drop) - .055 * math.cos(drop)
                        - .010 * width)
        shoulder = Vector((sign * (.195 * width + clearance), 0, 1.39))
        direction = Vector((sign * math.cos(drop), 0, -math.sin(drop)))
        up = Vector((sign * math.sin(drop), 0, math.cos(drop)))
        previous = boundary
        arm_indices = list(boundary)
        # Three elbow loops localize later weight blending. The wrist's
        # front/back radius retains the old endpoint envelope after uniform
        # sampling, rather than silently thickening existing hand joins.
        sections = [(0.055, .069, .075), (.14, .061, .065),
                    (.245, .050, .052), (.285, .048, .050),
                    (.325, .047, .049), (.43, .040, .041),
                    (.52, .0216, .030)]
        for distance, ry, rz in sections:
            center = shoulder + distance * direction
            current = []
            for a in angles:
                p = center + Vector((0, sign * math.cos(a) * ry, 0)) + up * (math.sin(a) * rz)
                current.append(len(verts))
                verts.append(tuple(p))
            for i in range(len(previous)):
                j = (i + 1) % len(previous)
                faces.append((previous[i], previous[j], current[j], current[i]))
            arm_indices.extend(current)
            previous = current
        groups[f"arm.{side}"] = arm_indices
        groups[f"wrist.{side}"] = previous
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata([tuple(scale * c for c in p) for p in verts], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    # Both sides use the same winding algorithm; recalculate after mirroring.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    for group_name, indices in groups.items():
        obj.vertex_groups.new(name=group_name).add(indices, 1.0, "REPLACE")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    if subdivision:
        mod = obj.modifiers.new("Construction subdivision", "SUBSURF")
        mod.levels = mod.render_levels = subdivision
    return obj
