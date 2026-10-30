"""Read-only surface bindings projected into compatible SceneIR anchor objects.

Indices always refer to the original mesh. Only known topology-preserving
modifiers are admitted; matching vertex counts alone do not establish identity.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_asset import load_asset, script_args

PREFIX = "bas:surface:"
DEFORMERS = {
    "ARMATURE", "CAST", "CORRECTIVE_SMOOTH", "CURVE", "DISPLACE",
    "HOOK", "LAPLACIANDEFORM", "LAPLACIANSMOOTH", "LATTICE",
    "MESH_DEFORM", "SHRINKWRAP", "SIMPLE_DEFORM", "SMOOTH",
    "SURFACE_DEFORM", "WARP", "WAVE", "NORMAL_EDIT", "WEIGHTED_NORMAL",
}


def topology(mesh):
    """Hash ordered connectivity, excluding positions that may deform."""
    digest = hashlib.sha256()
    digest.update(str(len(mesh.vertices)).encode())
    for edges in mesh.edges:
        digest.update(("e" + ",".join(map(str, edges.vertices)) + ";").encode())
    for polygon in mesh.polygons:
        digest.update(("p" + ",".join(map(str, polygon.vertices)) + ";").encode())
    return digest.hexdigest()


def bind(spec, signatures=None):
    """Bind one patch, sharing immutable source topology within this request."""
    obj = bpy.context.scene.objects.get(spec["objectName"])
    if obj is None or obj.type != "MESH":
        raise ValueError(f'Anchor requires an existing mesh: {spec["objectName"]}')
    if len(obj.data.vertices) > 500_000 or len(obj.data.polygons) > 500_000:
        raise ValueError("Anchor mesh exceeds 500000 vertices or polygons")
    if ("vertexIndices" in spec) == ("vertexGroup" in spec):
        raise ValueError("Each anchor requires exactly one vertexIndices or vertexGroup selector")
    if "vertexGroup" in spec:
        group = obj.vertex_groups.get(spec["vertexGroup"])
        if group is None:
            raise ValueError(f'Missing vertex group: {spec["vertexGroup"]}')
        weights = [(v.index, g.weight) for v in obj.data.vertices
                   for g in v.groups if g.group == group.index and g.weight > 0]
    else:
        indices = spec["vertexIndices"]
        if any(type(i) is not int or i < 0 or i >= len(obj.data.vertices) for i in indices):
            raise ValueError("Vertex index outside original mesh")
        if len(indices) != len(set(indices)):
            raise ValueError("Duplicate vertex index")
        weights = [(i, 1.0) for i in indices]
    if not 1 <= len(weights) <= 4096:
        raise ValueError("An anchor must bind 1..4096 vertices; use a small boundary patch")
    weights.sort()
    if signatures is None:
        signatures = {}
    if obj.name not in signatures:
        signatures[obj.name] = topology(obj.data)
    signature = signatures[obj.name]
    binding = hashlib.sha256(json.dumps([obj.name, signature, weights]).encode()).hexdigest()
    # The centroid is invariant under uniform rescaling of the group weights.
    # Identify aliases without changing the historical repair-binding hash.
    total = sum(weight for _, weight in weights)
    normalized = [(index, weight / total) for index, weight in weights]
    return obj, weights, signature, dict(
        id=PREFIX + spec["id"], object_name=obj.name, selector=spec,
        vertex_count=len(weights), binding_sha256=binding,
        surface_weights=normalized,
        topology_sha256=signature,
    )


def sample(bindings):
    """Evaluate each bound object once per frame and preserve anchor order."""
    scene = bpy.context.scene
    graph = bpy.context.evaluated_depsgraph_get()
    anchors_by_id = {}
    groups = {}
    for binding in bindings:
        groups.setdefault(binding[0].name, []).append(binding)
    for group in groups.values():
        obj = group[0][0]
        for modifier in obj.modifiers:
            if modifier.show_viewport and modifier.type not in DEFORMERS:
                raise ValueError(f"Unsupported modifier for stable surface binding: {obj.name}/{modifier.name} ({modifier.type}); use a topology-stable inspection copy and rebind")
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=graph)
        try:
            signature = topology(mesh)
            for _, weights, expected_signature, metadata in group:
                if signature != expected_signature:
                    raise ValueError(f"Evaluated topology changed: {obj.name}; rebind on a stable inspection copy")
                position = sum((evaluated.matrix_world @ mesh.vertices[i].co * weight
                                for i, weight in weights), Vector()) / sum(w for _, w in weights)
                if not all(math.isfinite(v) and abs(v) <= 1e9 for v in position):
                    raise ValueError("Invalid evaluated anchor position")
                anchors_by_id[metadata["id"]] = dict(
                    id=metadata["id"], kind="SURFACE_ANCHOR", parent=None,
                    semantic_role="bas:evaluated_surface_anchor",
                    world_matrix=[[1, 0, 0, position.x], [0, 1, 0, position.y],
                                  [0, 0, 1, position.z], [0, 0, 0, 1]],
                    bounds=None, mesh=None,
                )
        finally:
            evaluated.to_mesh_clear()
    return dict(
        schema_version="bas-scene-ir/0.1", source="", blender_version=bpy.app.version_string,
        frame=scene.frame_current, meters_per_unit=scene.unit_settings.scale_length,
        limitations=["Derived surface-anchor projection only; not a complete scene.",
                     "Weighted centroids of fixed vertex patches, not closest-surface distance.",
                     "Evaluated viewport modifiers; no baking, collision, orientation or unsampled-frame guarantee."],
        objects=[anchors_by_id[binding[3]["id"]] for binding in bindings],
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--request", required=True)
    args = parser.parse_args(script_args())
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    if output.exists() or source == output:
        raise ValueError("Output must be a new file distinct from source")
    request_path = Path(args.request)
    if request_path.stat().st_size > 2_000_000:
        raise ValueError("Attachment request too large")
    request = json.loads(request_path.read_text(encoding="utf-8"))
    frames, specs = request["frames"], request["anchors"]
    if not 2 <= len(frames) <= 12 or any(type(f) is not int or abs(f) > 1_048_574 for f in frames) or frames != sorted(set(frames)):
        raise ValueError("Require 2..12 distinct increasing Blender frames")
    if not 2 <= len(specs) <= 32 or len({s["id"] for s in specs}) != len(specs):
        raise ValueError("Require 2..32 uniquely named anchors")
    with source.open("rb") as source_stream:
        source_hash = hashlib.file_digest(source_stream, "sha256").hexdigest()
    load_asset(source)
    signatures = {}
    bindings = [bind(spec, signatures) for spec in specs]
    scenes = []
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        current = sample(bindings)
        current["source"] = str(source)
        scenes.append(current)
    result = dict(schema_version="bas-surface-motion/0.1", source_sha256=source_hash,
                  bindings=[binding[3] for binding in bindings], scenes=scenes)
    with output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, allow_nan=False)
    print(f"BAS_ATTACHMENT_EVIDENCE={output}")


if __name__ == "__main__":
    main()
