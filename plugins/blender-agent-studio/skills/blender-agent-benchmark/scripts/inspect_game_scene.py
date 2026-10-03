"""Evaluate a declared game-scene assembly without trusting self-reported metrics.

Support samples and collision candidates are bounded diagnostics, not exhaustive
physics validation. Never save or change the submitted scene.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def descendants(root):
    return [root, *root.children_recursive]


def mesh_geometry(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        triangles = [tuple(triangle.vertices) for triangle in mesh.loop_triangles]
        invalid = sum(not all(math.isfinite(v) for v in point) for point in vertices)
        degenerate = sum(triangle.area < 1e-12 for triangle in mesh.loop_triangles)
        missing_material = sum(poly.material_index >= len(mesh.materials) or mesh.materials[poly.material_index] is None for poly in mesh.polygons)
        textured = any(material and material.use_nodes and any(node.type == "TEX_IMAGE" for node in material.node_tree.nodes) for material in mesh.materials)
        return {"vertices": vertices, "triangles": triangles, "invalid": invalid,
                "degenerate": degenerate, "missing_material": missing_material,
                "textured_without_uv": bool(textured and not mesh.uv_layers)}
    finally:
        evaluated.to_mesh_clear()


def geometry(objects, depsgraph):
    vertices, triangles = [], []
    for obj in objects:
        data = mesh_geometry(obj, depsgraph)
        offset = len(vertices)
        vertices.extend(data["vertices"])
        triangles.extend(tuple(index + offset for index in tri) for tri in data["triangles"])
    if not vertices or not triangles:
        return None
    minimum = [min(v[axis] for v in vertices) for axis in range(3)]
    maximum = [max(v[axis] for v in vertices) for axis in range(3)]
    return {"vertices": vertices, "triangles": triangles, "min": minimum, "max": maximum,
            "tree": BVHTree.FromPolygons(vertices, triangles, all_triangles=True)}


def bounds_gap(a, b):
    return math.sqrt(sum(max(a["min"][axis] - b["max"][axis], b["min"][axis] - a["max"][axis], 0) ** 2 for axis in range(3)))


def inspect(manifest, spec):
    errors, warnings, rows = [], [], []
    if abs(bpy.context.scene.unit_settings.scale_length - 1) > 0.0001:
        errors.append("Scene units must use one meter per Blender unit")
    for image in bpy.data.images:
        if image.source == "FILE" and image.users and not image.packed_file:
            errors.append(f"External image dependency is not packed: {image.name}")
    assets = manifest.get("assets", [])
    if manifest.get("schemaVersion") != 1 or not isinstance(assets, list):
        raise ValueError("Expected scene_manifest schemaVersion 1 with an assets array")
    expected = {f"{family['id']}_{index:02}": family for family in spec["families"] for index in range(1, family["count"] + 1)}
    declarations = {}
    for asset in assets:
        if not isinstance(asset, dict) or not isinstance(asset.get("root"), str):
            raise ValueError("Each manifest asset needs a root name")
        if asset["root"] in declarations:
            errors.append(f"Duplicate manifest root: {asset['root']}")
        declarations[asset["root"]] = asset
    for root in sorted(set(expected) - set(declarations)):
        errors.append(f"Missing required instance: {root}")
    for root in sorted(set(declarations) - set(expected)):
        errors.append(f"Unexpected instance: {root}")
    depsgraph = bpy.context.evaluated_depsgraph_get()
    groups, trees, owned = {}, {}, set()
    for name, family in expected.items():
        root = bpy.data.objects.get(name)
        if root is None or root.type != "EMPTY":
            errors.append(f"Missing EMPTY asset root: {name}")
            continue
        parent = root.parent
        while parent:
            if parent.name in expected:
                errors.append(f"Nested asset root: {name} inside {parent.name}")
            parent = parent.parent
        meshes = [obj for obj in descendants(root) if obj.type == "MESH" and not obj.hide_render]
        groups[name] = meshes
        for obj in meshes:
            if obj.name in owned:
                errors.append(f"Mesh belongs to multiple asset roots: {obj.name}")
            owned.add(obj.name)
        data = geometry(meshes, depsgraph)
        if data is None:
            errors.append(f"Empty asset: {name}")
            continue
        trees[name] = data
        row_errors = []
        if len(data["triangles"]) > family["triangles"]:
            row_errors.append("per-instance triangle budget exceeded")
        if min(root.matrix_world.to_scale()) < 0 or root.matrix_world.determinant() <= 0:
            row_errors.append("negative or singular root transform")
        if any(abs(scale - 1) > 0.001 for scale in root.matrix_world.to_scale()):
            row_errors.append("root scale is not applied")
        up = root.matrix_world.to_3x3() @ Vector((0, 0, 1))
        if up.normalized().dot(Vector((0, 0, 1))) < math.cos(math.radians(2)):
            row_errors.append("asset root is tilted rather than upright")
        for axis in range(3):
            if data["min"][axis] < spec["layout"]["bounds"]["min"][axis] - 0.01 or data["max"][axis] > spec["layout"]["bounds"]["max"][axis] + 0.01:
                row_errors.append(f"outside scene bounds on axis {axis}")
        for obj in meshes:
            mesh = mesh_geometry(obj, depsgraph)
            if mesh["invalid"] or mesh["degenerate"] or mesh["missing_material"] or mesh["textured_without_uv"]:
                row_errors.append(f"invalid geometry/material/texture UV data: {obj.name}")
            if obj.matrix_world.determinant() <= 0:
                row_errors.append(f"negative or singular mesh transform: {obj.name}")
        row = {"root": name, "family": family["id"], "meshes": [obj.name for obj in meshes],
               "triangles": len(data["triangles"]), "budget": family["triangles"],
               "bounds": {"min": data["min"], "max": data["max"]},
               "world_matrix": [list(row) for row in root.matrix_world], "errors": row_errors}
        rows.append(row)
        errors.extend(f"{name}: {error}" for error in row_errors)
    unowned = [obj.name for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render and obj.name not in owned]
    errors.extend(f"Visible mesh outside asset roots: {name}" for name in unowned)
    if sum(row["triangles"] for row in rows) > spec["totalTriangles"]:
        errors.append("Whole-scene triangle budget exceeded")
    used_materials = {material.name for meshes in groups.values() for obj in meshes for material in obj.data.materials if material}
    if len(used_materials) > spec["maxMaterials"]:
        errors.append("Whole-scene material budget exceeded")
    for anchor in spec["layout"]["anchors"]:
        root = bpy.data.objects.get(anchor["root"])
        if root is None:
            continue
        location = root.matrix_world.translation
        if math.hypot(location.x - anchor["x"], location.y - anchor["y"]) > anchor["radius"]:
            errors.append(f"Anchor placement: {root.name}")
        if "yawDegrees" in anchor:
            forward = root.matrix_world.to_3x3() @ Vector((0, -1, 0))
            angle = math.radians(anchor["yawDegrees"])
            wanted = Vector((math.sin(angle), -math.cos(angle), 0))
            if forward.normalized().dot(wanted) < math.cos(math.radians(15)):
                errors.append(f"Anchor facing direction: {root.name}")
    support_checks = []
    for name, asset in declarations.items():
        if name not in trees or name not in expected:
            continue
        if asset.get("family") != expected[name]["id"]:
            errors.append(f"Wrong family declaration: {name}")
        mode = asset.get("supportMode")
        if name == "terrain_01":
            if mode != "foundation" or asset.get("support") is not None or asset.get("supportMeshes") != []:
                errors.append("terrain_01 must be the sole foundation")
            continue
        required_mode = "attached" if expected[name]["id"] == "lantern" else "resting"
        if mode != required_mode:
            errors.append(f"Invalid support mode: {name}")
        support = asset.get("support")
        if support not in trees or support == name:
            errors.append(f"Missing or self-referential support: {name}")
            continue
        visited, next_name = {name}, support
        while next_name != "terrain_01":
            if next_name in visited or next_name not in declarations:
                errors.append(f"Support graph does not reach terrain: {name}")
                break
            visited.add(next_name)
            next_name = declarations[next_name].get("support")
        contact_names = asset.get("supportMeshes")
        if not isinstance(contact_names, list) or not contact_names or any(not isinstance(value, str) for value in contact_names):
            errors.append(f"Missing support mesh declarations: {name}")
            continue
        members = {obj.name: obj for obj in groups[name]}
        for mesh_name in contact_names:
            if mesh_name not in members:
                errors.append(f"Support mesh is not owned by {name}: {mesh_name}")
                continue
            mesh_data = geometry([members[mesh_name]], depsgraph)
            if mode == "attached":
                gap = bounds_gap(mesh_data, trees[support])
                if gap > 0.01:
                    errors.append(f"Definitely separated attachment: {mesh_name}")
                support_checks.append({"mesh": mesh_name, "support": support, "aabb_gap": gap, "status": "contact_unverified"})
                continue
            # Sample actual evaluated bottom vertices, not manifest coordinates.
            bottom = [v for v in mesh_data["vertices"] if v.z <= mesh_data["min"][2] + 0.001]
            step = max(1, math.ceil(len(bottom) / 16))
            samples = bottom[::step][:16]
            gaps = []
            for point in samples:
                start_z = max(trees[support]["max"][2], point.z) + 1
                hit, _, _, _ = trees[support]["tree"].ray_cast(Vector((point.x, point.y, start_z)), Vector((0, 0, -1)), 40)
                gaps.append(None if hit is None else point.z - hit.z)
            bad = not samples or any(gap is None or abs(gap) > 0.01 for gap in gaps)
            if bad:
                errors.append(f"Floating, buried or unsupported sampled foot: {mesh_name}")
            support_checks.append({"mesh": mesh_name, "support": support, "sample_count": len(samples), "signed_gaps": gaps, "status": "sample_failure" if bad else "sample_pass"})
    walkway_hits = []
    for x in (-0.8, 0, 0.8):
        for z in (0.25, 1, 1.75):
            for name, data in trees.items():
                if name == "terrain_01":
                    continue
                hit, _, _, _ = data["tree"].ray_cast(Vector((x, -7.8, z)), Vector((0, 1, 0)), 8.8)
                if hit is not None:
                    walkway_hits.append({"root": name, "point": list(hit)})
    if walkway_hits:
        errors.append("Required central route has sampled geometry obstructions")
    collision_candidates = []
    names = list(trees)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if a == "terrain_01" or b == "terrain_01" or declarations.get(a, {}).get("support") == b or declarations.get(b, {}).get("support") == a:
                continue
            if bounds_gap(trees[a], trees[b]) > 0:
                continue
            overlap = trees[a]["tree"].overlap(trees[b]["tree"])
            if overlap:
                collision_candidates.append({"a": a, "b": b, "triangle_pair_count": len(overlap), "status": "review_required"})
    if collision_candidates:
        warnings.append("Cross-asset triangle intersection candidates require review; touching boundaries may be intentional and full containment may be missed")
    return {"schemaVersion": 1, "technicalPass": not errors, "status": "constraints_failed" if errors else "review_required",
            "errors": errors, "warnings": warnings, "assets": rows, "supportChecks": support_checks,
            "walkwayHits": walkway_hits, "collisionCandidates": collision_candidates,
            "limits": ["Support checks cover declared contact meshes and at most 16 lowest vertices per mesh; omitted feet still need visual review.",
                       "Nine route rays are not exhaustive navigation/collision validation.",
                       "Attachment AABB overlap is not contact proof. Cross-asset intersections are candidates, not automatic failures.",
                       "Technical validity does not establish per-asset artistic quality, target-engine integration, draw-call cost or runtime performance."]}


def main():
    parser = argparse.ArgumentParser()
    for name in ("input", "manifest", "spec", "output"):
        parser.add_argument(f"--{name}", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if Path(args.input).suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(Path(args.input).resolve()))
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
    report = inspect(json.loads(Path(args.manifest).read_text(encoding="utf-8-sig")), json.loads(Path(args.spec).read_text(encoding="utf-8")))
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
