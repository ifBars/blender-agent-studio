from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fit a rigged VRChat hairstyle to a head in evaluated world space.")
    parser.add_argument("--head", required=True)
    parser.add_argument("--hair", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--metrics", required=True)
    parser.add_argument("--mode", choices=("naive", "cranial"), default="cranial")
    parser.add_argument("--head-object", default="")
    parser.add_argument("--hair-object", default="")
    parser.add_argument("--target-clearance-mm", type=float, default=4.0)
    parser.add_argument("--back-bias-mm", type=float, default=0.0)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def import_asset(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    suffix = path.suffix.lower()
    if suffix == ".fbx":
        if hasattr(bpy.ops.wm, "fbx_import"):
            bpy.ops.wm.fbx_import(filepath=str(path))
        else:
            bpy.ops.import_scene.fbx(filepath=str(path))
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".blend":
        with bpy.data.libraries.load(str(path), link=False) as (source, target):
            target.objects = source.objects
        for obj in target.objects:
            if obj is not None:
                bpy.context.scene.collection.objects.link(obj)
    else:
        raise ValueError(f"Unsupported asset format: {path}")
    return [obj for obj in bpy.data.objects if obj not in before]


def world_points(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def quantile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("Cannot calculate a quantile of an empty sequence")
    position = max(0.0, min(1.0, fraction)) * (len(ordered) - 1)
    lower = int(math.floor(position))
    upper = int(math.ceil(position))
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def choose_mesh(objects: list[bpy.types.Object], requested: str, kind: str) -> bpy.types.Object:
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if requested:
        for obj in meshes:
            if obj.name == requested:
                return obj
        raise ValueError(f"Requested {kind} mesh does not exist: {requested}")
    if kind == "hair":
        named = [obj for obj in meshes if "hair" in obj.name.lower() and "horn" not in obj.name.lower()]
        if named:
            meshes = named
    if not meshes:
        raise ValueError(f"No {kind} mesh found")
    return max(meshes, key=lambda obj: len(obj.data.vertices))


def create_fit_root(hair_objects: list[bpy.types.Object]) -> bpy.types.Object:
    root = bpy.data.objects.new("VRChat_HairFit_Root", None)
    bpy.context.scene.collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    top_level = [obj for obj in hair_objects if obj.parent not in hair_objects]
    for obj in top_level:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_parent_inverse = root.matrix_world.inverted()
        obj.matrix_world = world
    style_meshes = [obj for obj in hair_objects if obj.type == "MESH"]
    root["vrchat_hair_style_count"] = len(style_meshes)
    for index, obj in enumerate(sorted(style_meshes, key=lambda item: item.name.lower())):
        root[f"style_{index + 1}"] = obj.name
    return root


def head_bvh(obj: bpy.types.Object) -> BVHTree:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        polygons = [tuple(polygon.vertices) for polygon in mesh.polygons]
        return BVHTree.FromPolygons(vertices, polygons, all_triangles=False)
    finally:
        evaluated.to_mesh_clear()


def transformed(point: Vector, anchor: Vector, target_anchor: Vector, scale: float) -> Vector:
    return target_anchor + (point - anchor) * scale


def fit_score(
    samples: list[Vector],
    bvh: BVHTree,
    anchor: Vector,
    target_anchor: Vector,
    scale: float,
    target_clearance: float,
    width_ratio: float,
) -> tuple[float, dict[str, float]]:
    samples_with_distance: list[tuple[float, float]] = []
    for point in samples:
        fitted = transformed(point, anchor, target_anchor, scale)
        nearest, normal, _index, distance = bvh.find_nearest(fitted)
        if nearest is None or normal is None or distance is None:
            continue
        samples_with_distance.append((float(distance), float((fitted - nearest).dot(normal))))
    if not samples_with_distance:
        return float("inf"), {}
    ordered = sorted(samples_with_distance, key=lambda item: item[0])
    near = ordered[: max(24, int(len(ordered) * 0.45))]
    near_distances = [item[0] for item in near]
    median_distance = statistics.median(near_distances)
    p95_distance = quantile(near_distances, 0.95)
    penetration_fraction = sum(item[1] < -0.0005 for item in near) / len(near)
    large_gap_fraction = sum(item[0] > 0.020 for item in near) / len(near)
    score = (
        abs(median_distance - target_clearance) * 700.0
        + max(0.0, p95_distance - 0.015) * 350.0
        + penetration_fraction * 18.0
        + large_gap_fraction * 8.0
        + abs(width_ratio - 1.06) * 4.0
    )
    return score, {
        "median_clearance_mm": median_distance * 1000.0,
        "p95_clearance_mm": p95_distance * 1000.0,
        "normal_side_warning_fraction": penetration_fraction,
        "large_gap_fraction": large_gap_fraction,
    }


def main() -> None:
    args = parse_args()
    head_path = Path(args.head).resolve()
    hair_path = Path(args.hair).resolve()
    for path in (head_path, hair_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    head_objects = import_asset(head_path)
    for obj in head_objects:
        obj.name = f"Head_{obj.name}"
    head = choose_mesh(head_objects, f"Head_{args.head_object}" if args.head_object else "", "head")
    hair_objects = import_asset(hair_path)
    hair = choose_mesh(hair_objects, args.hair_object, "hair")

    head_points = world_points(head)
    hair_points = world_points(hair)
    hx = [point.x for point in head_points]
    hy = [point.y for point in head_points]
    hz = [point.z for point in head_points]
    hair_x = [point.x for point in hair_points]
    hair_y = [point.y for point in hair_points]
    hair_z = [point.z for point in hair_points]

    head_z_mid = quantile(hz, 0.52)
    # Lucia and the benchmark hair assets face -Y. Remove the protruding face
    # side, not the back of the skull, when deriving a cranial fit region.
    head_y_front_cut = quantile(hy, 0.22)
    cranial = [point for point in head_points if point.z >= head_z_mid and point.y >= head_y_front_cut]
    if len(cranial) < 100:
        cranial = [point for point in head_points if point.z >= head_z_mid]
    skull_width = quantile([p.x for p in cranial], 0.98) - quantile([p.x for p in cranial], 0.02)
    skull_depth = quantile([p.y for p in cranial], 0.95) - quantile([p.y for p in cranial], 0.05)
    skull_top = quantile([p.z for p in cranial], 0.995)
    cranial_x = [p.x for p in cranial]
    skull_center = Vector(((quantile(cranial_x, 0.02) + quantile(cranial_x, 0.98)) * 0.5, statistics.median([p.y for p in cranial]), statistics.median([p.z for p in cranial])))
    head_crown = [point for point in cranial if point.z >= quantile([p.z for p in cranial], 0.90)]
    head_crown_y = statistics.median(point.y for point in head_crown)

    hair_center_x = (quantile(hair_x, 0.02) + quantile(hair_x, 0.98)) * 0.5
    hair_width = quantile(hair_x, 0.98) - quantile(hair_x, 0.02)
    hair_height = quantile(hair_z, 0.99) - quantile(hair_z, 0.01)
    upper_band = [point for point in hair_points if quantile(hair_z, 0.70) <= point.z <= quantile(hair_z, 0.85)]
    upper_band_width = quantile([point.x for point in upper_band], 0.95) - quantile([point.x for point in upper_band], 0.05)
    has_lateral_style_outliers = (
        hair_width / max(upper_band_width, 1e-6) > 1.40
        and hair_height / max(hair_width, 1e-6) < 2.0
    )
    scalp_width = upper_band_width if has_lateral_style_outliers else hair_width
    scalp_samples = [
        point for point in hair_points
        if point.z >= quantile(hair_z, 0.42)
        and abs(point.x - hair_center_x) <= hair_width * 0.43
    ]
    if len(scalp_samples) > 1800:
        stride = max(1, len(scalp_samples) // 1800)
        scalp_samples = scalp_samples[::stride]
    # Long front/side strands dominate the full-mesh Y median.  Using that as
    # the placement anchor pulls the actual root cluster onto the forehead.
    # Anchor Y from the upper crown vertices instead, while retaining the
    # lower Z pivot that keeps a uniform transform stable for long styles.
    hair_crown = [point for point in hair_points if point.z >= quantile(hair_z, 0.90)]
    hair_crown_y = statistics.median(point.y for point in hair_crown)
    hair_anchor = Vector((hair_center_x, hair_crown_y, quantile(hair_z, 0.72)))
    target_clearance = args.target_clearance_mm / 1000.0

    if args.mode == "naive":
        scale = skull_width / max(hair_width, 1e-6)
        target_anchor = Vector((skull_center.x, skull_center.y, skull_top + (hair_anchor.z - min(hair_z)) * scale))
        score, measures = fit_score(scalp_samples, head_bvh(head), hair_anchor, target_anchor, scale, target_clearance, hair_width * scale / skull_width)
    else:
        initial_scale = skull_width * 1.06 / max(scalp_width, 1e-6)
        initial_target = Vector((skull_center.x, head_crown_y, skull_top - (quantile(hair_z, 0.90) - hair_anchor.z) * initial_scale + target_clearance))
        bvh = head_bvh(head)
        best: tuple[float, float, Vector, dict[str, float]] | None = None
        for scale_step in range(-3, 4):
            scale = initial_scale * (1.0 + scale_step * 0.012)
            # The seed aligns the upper hair region to the crown center. Nearest-
            # surface distance alone can otherwise cheat by sliding long styles
            # down and forward onto the forehead, so refinements may only move
            # upward and toward the back of a standard VRChat head (+Y).
            for y_mm in range(0, 81, 5):
                for z_mm in range(0, 31, 3):
                    target_anchor = initial_target + Vector((0.0, y_mm / 1000.0, z_mm / 1000.0))
                    score, measures = fit_score(scalp_samples, bvh, hair_anchor, target_anchor, scale, target_clearance, scalp_width * scale / skull_width)
                    if best is None or score < best[0]:
                        best = (score, scale, target_anchor, measures)
        assert best is not None
        score, scale, target_anchor, measures = best
        if args.back_bias_mm:
            target_anchor += Vector((0.0, args.back_bias_mm / 1000.0, 0.0))
            score, measures = fit_score(
                scalp_samples,
                bvh,
                hair_anchor,
                target_anchor,
                scale,
                target_clearance,
                scalp_width * scale / skull_width,
            )

    delta = Matrix.Translation(target_anchor) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-hair_anchor)
    for obj in [item for item in hair_objects if item.parent not in hair_objects]:
        obj.matrix_world = delta @ obj.matrix_world
    root = create_fit_root(hair_objects)
    bpy.context.view_layer.update()
    hair_surface = head_bvh(hair)
    coverage_distances = []
    rear_coverage_distances = []
    cranial_y_mid = statistics.median(point.y for point in cranial)
    for point in cranial:
        nearest = hair_surface.find_nearest(point)
        if nearest is None:
            continue
        distance = nearest[3]
        coverage_distances.append(distance)
        if point.y >= cranial_y_mid:
            rear_coverage_distances.append(distance)
    coverage_limit = 0.018
    scalp_coverage_fraction = sum(distance <= coverage_limit for distance in coverage_distances) / max(len(coverage_distances), 1)
    rear_scalp_coverage_fraction = sum(distance <= coverage_limit for distance in rear_coverage_distances) / max(len(rear_coverage_distances), 1)
    root["fit_mode"] = args.mode
    root["uniform_scale"] = scale
    root["target_clearance_mm"] = args.target_clearance_mm

    output_blend = Path(args.output_blend).resolve()
    output_glb = Path(args.output_glb).resolve()
    metrics_path = Path(args.metrics).resolve()
    for path in (output_blend, output_glb, metrics_path):
        path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    # FBX custom bone shapes can be pulled into glTF as indirect armature
    # dependencies even when selection export is enabled. The authored Blend
    # keeps them; remove them only from the temporary post-save export scene.
    for obj in list(bpy.data.objects):
        if any(collection.name == "glTF_not_exported" for collection in obj.users_collection):
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [*head_objects, *hair_objects, root]
    export_objects = [
        obj for obj in export_objects
        if not any(collection.name == "glTF_not_exported" for collection in obj.users_collection)
    ]
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        export_animations=True,
        use_selection=True,
    )

    result = {
        "schema_version": 1,
        "mode": args.mode,
        "head": str(head_path),
        "hair": str(hair_path),
        "head_mesh": head.name,
        "hair_mesh": hair.name,
        "uniform_scale": scale,
        "translation": list(target_anchor - hair_anchor),
        "skull_width_mm": skull_width * 1000.0,
        "skull_depth_mm": skull_depth * 1000.0,
        "hair_extent_width_mm": hair_width * 1000.0,
        "hair_scalp_width_mm": scalp_width * 1000.0,
        "head_crown_y_mm": head_crown_y * 1000.0,
        "hair_crown_y_mm": hair_crown_y * 1000.0,
        "refinement_y_mm": (target_anchor.y - initial_target.y) * 1000.0 if args.mode != "naive" else 0.0,
        "refinement_z_mm": (target_anchor.z - initial_target.z) * 1000.0 if args.mode != "naive" else 0.0,
        "back_bias_mm": args.back_bias_mm if args.mode != "naive" else 0.0,
        "lateral_style_outliers": has_lateral_style_outliers,
        "hair_width_ratio": (hair_width if args.mode == "naive" else scalp_width) * scale / skull_width,
        "sample_count": len(scalp_samples),
        "score": score,
        "style_meshes": sorted(obj.name for obj in hair_objects if obj.type == "MESH"),
        "hair_armatures": sum(obj.type == "ARMATURE" for obj in hair_objects),
        "hair_bones": sum(len(obj.data.bones) for obj in hair_objects if obj.type == "ARMATURE"),
        "scalp_coverage_fraction": scalp_coverage_fraction,
        "rear_scalp_coverage_fraction": rear_scalp_coverage_fraction,
        "coverage_limit_mm": coverage_limit * 1000.0,
        **measures,
    }
    result["pass"] = (
        1.0 <= result["median_clearance_mm"] <= 8.0
        and result["p95_clearance_mm"] <= 15.0
        and result["large_gap_fraction"] < 0.02
        and 1.02 <= result["hair_width_ratio"] <= 1.10
        and result["scalp_coverage_fraction"] >= 0.65
        and result["rear_scalp_coverage_fraction"] >= 0.65
    )
    metrics_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"BLENDER_AGENT_STUDIO_HAIR_FIT={metrics_path}")


if __name__ == "__main__":
    main()
