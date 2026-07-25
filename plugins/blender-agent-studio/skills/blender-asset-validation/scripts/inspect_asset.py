"""Inspect a Blender asset and write deterministic JSON metrics.

Run through Blender:
blender --background --factory-startup --python inspect_asset.py -- \
  --input asset.blend --output metrics.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import deque
from pathlib import Path
from typing import Any

import bmesh
import bpy


def script_args() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(script_args())


def load_asset(path: Path) -> None:
    suffix = path.suffix.lower()
    if suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(path))
        return

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".fbx":
        if hasattr(bpy.ops.wm, "fbx_import"):
            bpy.ops.wm.fbx_import(filepath=str(path))
        else:
            bpy.ops.import_scene.fbx(filepath=str(path))
    elif suffix == ".obj":
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=str(path))
        else:
            bpy.ops.import_scene.obj(filepath=str(path))
    else:
        raise ValueError(f"Unsupported asset extension: {suffix}")


def finite_vector(values: Any) -> bool:
    return all(math.isfinite(float(value)) for value in values)


def rounded(values: Any, places: int = 6) -> list[float]:
    return [round(float(value), places) for value in values]


def connected_components(mesh: bpy.types.Mesh) -> int:
    if not mesh.vertices:
        return 0
    adjacency: list[list[int]] = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        first, second = edge.vertices
        adjacency[first].append(second)
        adjacency[second].append(first)

    visited: set[int] = set()
    components = 0
    for start in range(len(mesh.vertices)):
        if start in visited:
            continue
        components += 1
        queue: deque[int] = deque([start])
        visited.add(start)
        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
    return components


def object_world_bounds(obj: bpy.types.Object) -> list[list[float]] | None:
    if obj.type != "MESH" or not obj.bound_box:
        return None
    corners = [obj.matrix_world @ obj_corner for obj_corner in map_vector(obj.bound_box)]
    mins = [min(corner[index] for corner in corners) for index in range(3)]
    maxs = [max(corner[index] for corner in corners) for index in range(3)]
    return [rounded(mins), rounded(maxs)]


def map_vector(corners: Any) -> list[Any]:
    from mathutils import Vector

    return [Vector(corner) for corner in corners]


def inspect_mesh(
    obj: bpy.types.Object,
    depsgraph: bpy.types.Depsgraph,
) -> dict[str, Any]:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        mesh.calc_loop_triangles()
        invalid_vertices = sum(
            1 for vertex in mesh.vertices if not finite_vector(vertex.co)
        )
        degenerate_faces = sum(
            1 for polygon in mesh.polygons if polygon.area <= 1e-12
        )
        zero_length_edges = sum(
            1
            for edge in mesh.edges
            if (mesh.vertices[edge.vertices[0]].co - mesh.vertices[edge.vertices[1]].co).length
            <= 1e-9
        )

        bm = bmesh.new()
        try:
            bm.from_mesh(mesh)
            boundary_edges = sum(1 for edge in bm.edges if edge.is_boundary)
            non_manifold_edges = sum(1 for edge in bm.edges if not edge.is_manifold)
            wire_edges = sum(1 for edge in bm.edges if edge.is_wire)
            isolated_vertices = sum(1 for vertex in bm.verts if not vertex.link_edges)
        finally:
            bm.free()

        material_slots = [
            slot.material.name if slot.material else None for slot in obj.material_slots
        ]
        missing_material_faces = sum(
            1
            for polygon in mesh.polygons
            if polygon.material_index >= len(material_slots)
            or material_slots[polygon.material_index] is None
        )

        return {
            "name": obj.name,
            "data_name": obj.data.name if obj.data else None,
            "vertices": len(mesh.vertices),
            "edges": len(mesh.edges),
            "polygons": len(mesh.polygons),
            "triangles": len(mesh.loop_triangles),
            "connected_components": connected_components(mesh),
            "invalid_vertices": invalid_vertices,
            "degenerate_faces": degenerate_faces,
            "zero_length_edges": zero_length_edges,
            "boundary_edges": boundary_edges,
            "non_manifold_edges": non_manifold_edges,
            "wire_edges": wire_edges,
            "isolated_vertices": isolated_vertices,
            "uv_layers": len(mesh.uv_layers),
            "material_slots": material_slots,
            "missing_material_faces": missing_material_faces,
            "modifiers": [
                {"name": modifier.name, "type": modifier.type}
                for modifier in obj.modifiers
            ],
            "shape_keys": (
                len(obj.data.shape_keys.key_blocks)
                if obj.data
                and getattr(obj.data, "shape_keys", None)
                and obj.data.shape_keys
                else 0
            ),
            "world_bounds": object_world_bounds(obj),
        }
    finally:
        evaluated.to_mesh_clear()


def inspect_action(action: bpy.types.Action) -> dict[str, Any]:
    start, end = action.frame_range
    return {
        "name": action.name,
        "frame_start": round(float(start), 4),
        "frame_end": round(float(end), 4),
        "users": int(action.users),
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    if not input_path.is_file():
        raise FileNotFoundError(input_path)

    load_asset(input_path)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    objects: list[dict[str, Any]] = []
    meshes: list[dict[str, Any]] = []

    for obj in sorted(bpy.context.scene.objects, key=lambda item: item.name):
        transform_is_finite = (
            finite_vector(obj.location)
            and finite_vector(obj.rotation_euler)
            and finite_vector(obj.scale)
        )
        objects.append(
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
                "collections": sorted(collection.name for collection in obj.users_collection),
                "location": rounded(obj.location),
                "rotation_euler": rounded(obj.rotation_euler),
                "scale": rounded(obj.scale),
                "dimensions": rounded(obj.dimensions),
                "transform_is_finite": transform_is_finite,
                "hidden_render": bool(obj.hide_render),
                "action": (
                    obj.animation_data.action.name
                    if obj.animation_data and obj.animation_data.action
                    else None
                ),
            }
        )
        if obj.type == "MESH":
            meshes.append(inspect_mesh(obj, depsgraph))

    aggregate_min = [math.inf, math.inf, math.inf]
    aggregate_max = [-math.inf, -math.inf, -math.inf]
    for mesh in meshes:
        bounds = mesh["world_bounds"]
        if not bounds:
            continue
        for axis in range(3):
            aggregate_min[axis] = min(aggregate_min[axis], bounds[0][axis])
            aggregate_max[axis] = max(aggregate_max[axis], bounds[1][axis])

    has_bounds = all(math.isfinite(value) for value in aggregate_min + aggregate_max)
    scene_bounds = (
        {
            "min": rounded(aggregate_min),
            "max": rounded(aggregate_max),
            "dimensions": rounded(
                aggregate_max[axis] - aggregate_min[axis] for axis in range(3)
            ),
        }
        if has_bounds
        else None
    )

    totals = {
        "objects": len(objects),
        "mesh_objects": len(meshes),
        "vertices": sum(mesh["vertices"] for mesh in meshes),
        "edges": sum(mesh["edges"] for mesh in meshes),
        "polygons": sum(mesh["polygons"] for mesh in meshes),
        "triangles": sum(mesh["triangles"] for mesh in meshes),
        "materials": len(bpy.data.materials),
        "actions": len(bpy.data.actions),
        "invalid_vertices": sum(mesh["invalid_vertices"] for mesh in meshes),
        "degenerate_faces": sum(mesh["degenerate_faces"] for mesh in meshes),
        "zero_length_edges": sum(mesh["zero_length_edges"] for mesh in meshes),
        "boundary_edges": sum(mesh["boundary_edges"] for mesh in meshes),
        "non_manifold_edges": sum(mesh["non_manifold_edges"] for mesh in meshes),
        "wire_edges": sum(mesh["wire_edges"] for mesh in meshes),
        "isolated_vertices": sum(mesh["isolated_vertices"] for mesh in meshes),
        "missing_material_faces": sum(
            mesh["missing_material_faces"] for mesh in meshes
        ),
    }

    issues: list[dict[str, Any]] = []
    if totals["mesh_objects"] == 0 or totals["triangles"] == 0:
        issues.append({"severity": "gate", "code": "empty_mesh"})
    if totals["invalid_vertices"]:
        issues.append(
            {
                "severity": "gate",
                "code": "invalid_vertices",
                "count": totals["invalid_vertices"],
            }
        )
    for key in (
        "degenerate_faces",
        "zero_length_edges",
        "isolated_vertices",
        "missing_material_faces",
    ):
        if totals[key]:
            issues.append({"severity": "warning", "code": key, "count": totals[key]})
    if any(not obj["transform_is_finite"] for obj in objects):
        issues.append({"severity": "gate", "code": "invalid_object_transform"})

    output = {
        "schema_version": 1,
        "input": str(input_path),
        "blender": {
            "version": bpy.app.version_string,
            "version_tuple": list(bpy.app.version),
            "build_hash": bpy.app.build_hash.decode("utf8", errors="replace"),
            "background": bool(bpy.app.background),
        },
        "scene": {
            "name": bpy.context.scene.name,
            "frame_start": int(bpy.context.scene.frame_start),
            "frame_end": int(bpy.context.scene.frame_end),
            "fps": float(bpy.context.scene.render.fps)
            / float(bpy.context.scene.render.fps_base),
            "bounds": scene_bounds,
        },
        "totals": totals,
        "objects": objects,
        "meshes": meshes,
        "materials": sorted(material.name for material in bpy.data.materials),
        "actions": [
            inspect_action(action)
            for action in sorted(bpy.data.actions, key=lambda item: item.name)
        ],
        "issues": issues,
        "hard_gate_pass": not any(issue["severity"] == "gate" for issue in issues),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(f"BLENDER_AGENT_STUDIO_METRICS={output_path}")


if __name__ == "__main__":
    main()
