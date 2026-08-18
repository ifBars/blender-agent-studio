"""Render fixed multiview evidence for a Blender asset."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy
import numpy as np
from mathutils import Vector


def script_args() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--resolution", type=int, default=384)
    parser.add_argument("--frames", default="")
    parser.add_argument("--material-mode", choices=("source", "vrchat-fit"), default="source")
    parser.add_argument("--hide-objects", default="")
    parser.add_argument("--head-texture", default="")
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


def scene_bounds() -> tuple[Vector, Vector]:
    points: list[Vector] = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError("No renderable mesh bounds found")
    mins = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maxs = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return mins, maxs


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def create_camera() -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("BAS_EvidenceCamera")
    camera = bpy.data.objects.new("BAS_EvidenceCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    return camera


def add_area_light(
    name: str,
    location: Vector,
    target: Vector,
    energy: float,
    size: float,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def diagnostic_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = 0.68
    shader.inputs["Metallic"].default_value = 0.0
    return material


def diagnostic_head_material(texture_path: Path | None) -> bpy.types.Material:
    skin = diagnostic_material("BAS_DiagnosticSkin", (0.42, 0.18, 0.14, 1.0))
    if texture_path is None:
        return skin
    if not texture_path.is_file():
        raise FileNotFoundError(texture_path)
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    texture = skin.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    shader = skin.node_tree.nodes.get("Principled BSDF")
    skin.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return skin


def apply_vrchat_fit_materials(head_texture: Path | None = None) -> None:
    skin = diagnostic_head_material(head_texture)
    hair = diagnostic_material("BAS_DiagnosticHair", (0.045, 0.075, 0.14, 1.0))
    accent = diagnostic_material("BAS_DiagnosticAccessory", (0.32, 0.12, 0.42, 1.0))
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        lowered = obj.name.lower()
        material = skin if lowered.startswith("head_") else accent if "horn" in lowered or "bow" in lowered else hair
        obj.data.materials.clear()
        obj.data.materials.append(material)


def configure_scene(center: Vector, extent: float, minimum_z: float, diagnostic: bool) -> None:
    scene = bpy.context.scene
    engine_items = scene.render.bl_rna.properties["engine"].enum_items
    engine_ids = {item.identifier for item in engine_items}
    if "BLENDER_EEVEE" in engine_ids:
        scene.render.engine = "BLENDER_EEVEE"
    elif "BLENDER_EEVEE_NEXT" in engine_ids:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    else:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.resolution_percentage = 100
    scene.render.use_file_extension = True
    scene.render.image_settings.color_depth = "8"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    if diagnostic:
        scene.view_settings.look = "AgX - Medium High Contrast"
        scene.view_settings.exposure = -1.0

    world = bpy.data.worlds.new("BAS_EvidenceWorld") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.035, 0.045, 0.06, 1.0)
    background.inputs["Strength"].default_value = 0.35

    bpy.ops.mesh.primitive_plane_add(
        size=max(extent * 8.0, 4.0),
        location=(center.x, center.y, minimum_z - max(extent * 0.006, 0.002)),
    )
    floor = bpy.context.object
    floor.name = "BAS_EvidenceFloor"
    material = bpy.data.materials.new("BAS_EvidenceFloorMaterial")
    material.diffuse_color = (0.075, 0.085, 0.11, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.075, 0.085, 0.11, 1.0)
    shader.inputs["Roughness"].default_value = 0.82
    floor.data.materials.append(material)

    add_area_light(
        "BAS_Key",
        center + Vector((extent * 2.2, -extent * 2.4, extent * 2.8)),
        center,
        140.0 if diagnostic else 1200.0,
        extent * 2.0,
    )
    add_area_light(
        "BAS_Fill",
        center + Vector((-extent * 2.5, -extent * 0.6, extent * 1.4)),
        center,
        65.0 if diagnostic else 700.0,
        extent * 2.4,
    )
    add_area_light(
        "BAS_Rim",
        center + Vector((extent * 0.4, extent * 2.5, extent * 2.0)),
        center,
        110.0 if diagnostic else 950.0,
        extent * 1.7,
    )


def render_view(
    camera: bpy.types.Object,
    name: str,
    direction: Vector,
    target: Vector,
    extent: float,
    output_dir: Path,
    resolution: int,
    orthographic: bool,
) -> Path:
    distance = max(extent * 2.8, 1.0)
    camera.location = target + direction.normalized() * distance
    look_at(camera, target)
    camera.data.type = "ORTHO" if orthographic else "PERSP"
    if orthographic:
        camera.data.ortho_scale = max(extent * 1.45, 0.5)
    else:
        camera.data.lens = 55

    scene = bpy.context.scene
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.filepath = str(output_dir / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    return Path(scene.render.filepath)


def create_contact_sheet(paths: list[Path], output_path: Path, resolution: int) -> None:
    columns = 3
    rows = math.ceil(len(paths) / columns)
    sheet = np.zeros((rows * resolution, columns * resolution, 4), dtype=np.float32)
    for index, path in enumerate(paths):
        image = bpy.data.images.load(str(path), check_existing=False)
        try:
            pixels = np.empty(len(image.pixels), dtype=np.float32)
            image.pixels.foreach_get(pixels)
            pixels = pixels.reshape((resolution, resolution, 4))
            row = rows - 1 - index // columns
            column = index % columns
            sheet[
                row * resolution : (row + 1) * resolution,
                column * resolution : (column + 1) * resolution,
                :,
            ] = pixels
        finally:
            bpy.data.images.remove(image)

    output = bpy.data.images.new(
        "BAS_ContactSheet",
        width=columns * resolution,
        height=rows * resolution,
        alpha=True,
    )
    output.pixels.foreach_set(sheet.ravel())
    output.filepath_raw = str(output_path)
    output.file_format = "PNG"
    output.save()
    bpy.data.images.remove(output)


def main() -> None:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    resolution = max(128, min(int(args.resolution), 1024))
    frames = [int(value) for value in args.frames.split(",") if value.strip()]

    if not input_path.is_file():
        raise FileNotFoundError(input_path)
    load_asset(input_path)
    hidden_names = {name.strip().casefold() for name in args.hide_objects.split(",") if name.strip()}
    for obj in bpy.context.scene.objects:
        if obj.name.casefold() in hidden_names:
            obj.hide_render = True
            obj.hide_viewport = True
    diagnostic = args.material_mode == "vrchat-fit"
    if diagnostic:
        apply_vrchat_fit_materials(Path(args.head_texture).resolve() if args.head_texture else None)

    mins, maxs = scene_bounds()
    center = (mins + maxs) * 0.5
    size = maxs - mins
    extent = max(float(size.x), float(size.y), float(size.z), 0.1)
    target = center + Vector((0.0, 0.0, float(size.z) * 0.04))
    configure_scene(center, extent, float(mins.z), diagnostic)
    camera = create_camera()

    views = [
        ("perspective", Vector((1.4, -1.7, 1.2)), False),
        ("front", Vector((0.0, -1.0, 0.05)), True),
        ("back", Vector((0.0, 1.0, 0.05)), True),
        ("left", Vector((-1.0, 0.0, 0.05)), True),
        ("right", Vector((1.0, 0.0, 0.05)), True),
        ("top", Vector((0.0, 0.0, 1.0)), True),
    ]
    paths = [
        render_view(
            camera,
            name,
            direction,
            target,
            extent,
            output_dir,
            resolution,
            orthographic,
        )
        for name, direction, orthographic in views
    ]
    contact_sheet = output_dir / "contact_sheet.png"
    create_contact_sheet(paths, contact_sheet, resolution)

    animation_paths: list[Path] = []
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        animation_paths.append(
            render_view(
                camera,
                f"frame_{frame:04d}",
                Vector((1.4, -1.7, 1.2)),
                target,
                extent,
                output_dir,
                resolution,
                False,
            )
        )

    animation_contact_sheet: Path | None = None
    if animation_paths:
        animation_contact_sheet = output_dir / "animation_contact_sheet.png"
        create_contact_sheet(animation_paths, animation_contact_sheet, resolution)

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "input": str(input_path),
        "blender_version": bpy.app.version_string,
        "resolution": resolution,
        "material_mode": args.material_mode,
        "hidden_objects": sorted(hidden_names),
        "head_texture": str(Path(args.head_texture).resolve()) if args.head_texture else None,
        "bounds": {
            "min": [round(float(value), 6) for value in mins],
            "max": [round(float(value), 6) for value in maxs],
            "dimensions": [round(float(value), 6) for value in size],
        },
        "views": [str(path) for path in paths],
        "contact_sheet": str(contact_sheet),
        "animation_frames": [
            {"frame": frame, "path": str(path)}
            for frame, path in zip(frames, animation_paths, strict=True)
        ],
        "animation_contact_sheet": (
            str(animation_contact_sheet) if animation_contact_sheet else None
        ),
    }
    manifest_path = output_dir / "evidence.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"BLENDER_AGENT_STUDIO_EVIDENCE={manifest_path}")


if __name__ == "__main__":
    main()
