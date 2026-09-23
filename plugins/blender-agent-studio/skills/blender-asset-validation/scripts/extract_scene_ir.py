"""Read-only, bounded evaluated-scene summary. No raw geometry or guessed roles."""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_asset import connected_components, load_asset, script_args


def extract_scene():
    scene = bpy.context.scene
    graph = bpy.context.evaluated_depsgraph_get()
    originals = sorted(scene.objects, key=lambda obj: obj.name_full)
    if len(originals) > 2048:
        raise ValueError("SceneIR supports at most 2048 scene objects; isolate an assembly first")
    objects = []
    total_vertices = 0
    limitations = [
        "Active scene and current frame; evaluated viewport dependency graph, not render-only modifier settings.",
        "Only MESH objects have geometry summaries; curves, volumes and other types require visual review.",
        "Hidden objects are included; this describes scene structure, not final rendered visibility.",
    ]
    if any(instance.is_instance for instance in graph.object_instances):
        limitations.append("Dependency-graph instances are not expanded. Realize instances before relying on totals or bounds.")
    ids = {obj.name_full for obj in originals}
    for obj in originals:
        evaluated = obj.evaluated_get(graph)
        matrix = [[float(v) for v in row] for row in evaluated.matrix_world]
        if not all(math.isfinite(v) for row in matrix for v in row):
            raise ValueError(f"Non-finite transform: {obj.name_full}")
        role = obj.get('bas_role')
        if role is not None and (not isinstance(role, str) or len(role) > 256):
            raise ValueError(f"bas_role must be a string of at most 256 characters: {obj.name_full}")
        parent = obj.parent.name_full if obj.parent else None
        if parent and parent not in ids:
            limitations.append(f"Parent outside active scene omitted for {obj.name_full}")
            parent = None
        entry = dict(id=obj.name_full, kind=obj.type, parent=parent,
                     semantic_role=role, world_matrix=matrix, bounds=None, mesh=None)
        if obj.type == 'MESH':
            mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=graph)
            try:
                total_vertices += len(mesh.vertices)
                if total_vertices > 2_000_000 or len(mesh.polygons) > 2_000_000:
                    raise ValueError("SceneIR geometry limit exceeded; isolate an assembly first")
                mins, maxs = [math.inf] * 3, [-math.inf] * 3
                for vertex in mesh.vertices:
                    world = evaluated.matrix_world @ vertex.co
                    if not all(math.isfinite(v) for v in world):
                        raise ValueError(f"Non-finite world vertex: {obj.name_full}")
                    for axis in range(3):
                        mins[axis] = min(mins[axis], float(world[axis]))
                        maxs[axis] = max(maxs[axis], float(world[axis]))
                if mesh.vertices:
                    entry['bounds'] = dict(min=mins, max=maxs)
                mesh.calc_loop_triangles()
                bm = bmesh.new()
                try:
                    bm.from_mesh(mesh)
                    non_manifold = sum(not edge.is_manifold for edge in bm.edges)
                finally:
                    bm.free()
                entry['mesh'] = dict(
                    vertices=len(mesh.vertices), triangles=len(mesh.loop_triangles),
                    connected_components=connected_components(mesh),
                    non_manifold_edges=non_manifold,
                    degenerate_faces=sum(poly.area <= 1e-12 for poly in mesh.polygons),
                    missing_material_faces=sum(
                        poly.material_index >= len(mesh.materials) or mesh.materials[poly.material_index] is None
                        for poly in mesh.polygons),
                )
            finally:
                evaluated.to_mesh_clear()
        objects.append(entry)
    return dict(schema_version='bas-scene-ir/0.1', source=bpy.data.filepath,
                blender_version=bpy.app.version_string, frame=scene.frame_current,
                meters_per_unit=scene.unit_settings.scale_length,
                limitations=limitations, objects=objects)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--frame', type=int)
    args = parser.parse_args(script_args())
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    if source == output or output.exists():
        raise ValueError('SceneIR output must be a new file distinct from the asset')
    load_asset(source)
    if args.frame is not None:
        if not -1_048_574 <= args.frame <= 1_048_574:
            raise ValueError('frame outside Blender range')
        bpy.context.scene.frame_set(args.frame)
    result = extract_scene()
    result['source'] = str(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, allow_nan=False, sort_keys=True)
    print(f'BAS_SCENE_IR={output}')


if __name__ == '__main__':
    main()
