"""Create non-rendering, axis-aligned reference image guides in a new .blend.

Run with Blender, never against an output that already exists:

    blender --background --factory-startup --disable-autoexec --threads 2 --python-exit-code 1 --python setup_reference_board.py -- \
        --input model.blend --manifest board.json --output model_refs.blend [--evidence-dir new_dir]

The manifest declares 1..8 views. Each view names an 8-bit PNG (optionally a
pixel crop), the camera side (`front`, `back`, `left` or `right`), an image empty
name, an orthographic camera name, the world-space centre of the pictured
subject, and the vertical span the cropped image covers in scene units
(meters assumed). The helper does not detect orientation, foreground, scale or
proportions; it places only what the manifest states.

View names describe where the camera stands, matching Blender's numpad views:
front = camera on -Y looking toward +Y; back = camera on +Y looking toward -Y;
right = camera on +X looking toward -X; left = camera on -X looking toward +X.
For a subject facing -Y, a profile whose nose points to image left is `right`.

PNG EXIF is accepted only without an Orientation tag or with Orientation 1;
Blender decodes stored pixels and ignores rotation/flip metadata, so other
orientations are rejected rather than guessed.

Cropped pixels are written unchanged as new PNG files in a new evidence
directory, never beside or over the source images, and those PNG bytes are
packed into the output .blend so its guides survive moving the file. The input
.blend is only read. Validation runs before any directory, image, object or file is created.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import sys

SCHEMA = "bas-reference-board/0.1"
REPORT_SCHEMA = "bas-reference-board-report/0.1"
MAX_VIEWS = 8
MAX_PIXELS = 16_777_216
MAX_PNG_BYTES = 256 * 1024 * 1024
MAX_MANIFEST_BYTES = 1024 * 1024
MAX_NAME_BYTES = 63
MAX_EXIF_BYTES = 65536
DEFAULT_OPACITY = 0.35
# Practical floors: a guide must stay visible and resolvable, and camera
# clipping derived from the span must stay above Blender's 1e-6 minimum.
OPACITY_RANGE = (0.05, 1.0)
SPAN_RANGE = (0.001, 10_000.0)
COORDINATE_LIMIT = 1e6
MIN_CROP_PIXELS = 16
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
UNIT_ASSUMPTION = "Scene units are assumed to be meters; verticalSpan is the manifest's stated value, not measured from images."

# rotation_euler (XYZ) maps the camera's local -Z to `forward`, local +X to the
# image/screen right and local +Y to world +Z. Image empties use the same basis,
# so their front face points toward the camera.
VIEWS = {
    "front": dict(forward=(0, 1, 0), right=(1, 0, 0), euler=(math.pi / 2, 0.0, 0.0),
                  description="camera on -Y looking toward +Y (Blender Front); image right is +X"),
    "back": dict(forward=(0, -1, 0), right=(-1, 0, 0), euler=(math.pi / 2, 0.0, math.pi),
                 description="camera on +Y looking toward -Y (Blender Back); image right is -X"),
    "right": dict(forward=(-1, 0, 0), right=(0, 1, 0), euler=(math.pi / 2, 0.0, math.pi / 2),
                  description="camera on +X looking toward -X (Blender Right); image right is +Y, so a subject facing -Y faces image left"),
    "left": dict(forward=(1, 0, 0), right=(0, -1, 0), euler=(math.pi / 2, 0.0, -math.pi / 2),
                 description="camera on -X looking toward +X (Blender Left); image right is -Y, so a subject facing -Y faces image right"),
}
VIEW_KEYS = {"name", "cameraName", "view", "image", "crop", "center", "verticalSpan"}
REQUIRED_VIEW_KEYS = VIEW_KEYS - {"crop"}
TOP_KEYS = {"schema", "collection", "opacity", "views"}
BOUNDED_TYPES = {"MESH", "CURVE", "SURFACE", "META", "FONT", "CURVES", "POINTCLOUD", "VOLUME", "GREASEPENCIL", "ARMATURE"}


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def exif_orientation(data):
    """Return IFD0 Orientation from TIFF-structured EXIF bytes, or None if absent."""
    if data.startswith(b"Exif\0\0"):
        data = data[6:]
    order = {b"II": "<", b"MM": ">"}.get(data[:2])
    if order is None or len(data) < 8 or struct.unpack(order + "H", data[2:4])[0] != 42:
        raise ValueError("malformed EXIF header")
    offset = struct.unpack(order + "I", data[4:8])[0]
    if offset < 8 or offset + 2 > len(data):
        raise ValueError("malformed EXIF IFD offset")
    count = struct.unpack(order + "H", data[offset:offset + 2])[0]
    if count > 512 or offset + 2 + 12 * count > len(data):
        raise ValueError("malformed EXIF IFD")
    for index in range(count):
        entry = data[offset + 2 + 12 * index:offset + 14 + 12 * index]
        tag, kind, values = struct.unpack(order + "HHI", entry[:8])
        if tag == 0x0112:
            if kind != 3 or values != 1:
                raise ValueError("malformed EXIF Orientation entry")
            return struct.unpack(order + "H", entry[8:10])[0]
    return None


def read_png_info(path):
    """Return (width, height) of an 8-bit-or-less PNG after bounded header checks."""
    path = Path(path)
    size = path.stat().st_size
    if size > MAX_PNG_BYTES:
        raise ValueError(f"{path.name}: PNG exceeds {MAX_PNG_BYTES} bytes")
    with open(path, "rb") as stream:
        if stream.read(8) != PNG_SIGNATURE:
            raise ValueError(f"{path.name}: not a PNG file")
        header = stream.read(25)
        if len(header) != 25 or header[:8] != struct.pack(">I4s", 13, b"IHDR"):
            raise ValueError(f"{path.name}: missing PNG IHDR header")
        width, height, depth, color, _, _, _ = struct.unpack(">IIBBBBB", header[8:21])
        if width < 1 or height < 1 or width * height > MAX_PIXELS:
            raise ValueError(f"{path.name}: {width}x{height} must contain 1..{MAX_PIXELS} pixels")
        allowed = {0: (1, 2, 4, 8), 2: (8,), 3: (1, 2, 4, 8), 4: (8,), 6: (8,)}
        if depth not in allowed.get(color, ()):
            raise ValueError(f"{path.name}: only 8-bit (or lower) PNG channels are supported; got depth {depth}, color type {color}")
        while True:
            chunk = stream.read(8)
            if len(chunk) != 8:
                raise ValueError(f"{path.name}: truncated PNG (no IEND chunk)")
            length, kind = struct.unpack(">I4s", chunk)
            if kind == b"IEND":
                break
            if stream.tell() + length + 4 > size:
                raise ValueError(f"{path.name}: truncated PNG chunk")
            if kind == b"eXIf":
                # Blender decodes stored pixels and ignores EXIF orientation. Accept
                # EXIF (resolution tags etc.) only when it requests no rotation/flip.
                if length > MAX_EXIF_BYTES:
                    raise ValueError(f"{path.name}: eXIf chunk exceeds {MAX_EXIF_BYTES} bytes")
                try:
                    orientation = exif_orientation(stream.read(length))
                except (ValueError, struct.error) as error:
                    raise ValueError(f"{path.name}: cannot verify EXIF orientation ({error})") from None
                if orientation not in (None, 1):
                    raise ValueError(f"{path.name}: EXIF Orientation {orientation} asks viewers to rotate or flip; "
                                     "export upright pixels with Orientation 1 or no EXIF")
                stream.seek(4, os.SEEK_CUR)
                continue
            stream.seek(length + 4, os.SEEK_CUR)
    return width, height


def _name(value, field):
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{field} must be a non-empty string without surrounding whitespace")
    if len(value.encode("utf-8")) > MAX_NAME_BYTES or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(f"{field} must be at most {MAX_NAME_BYTES} UTF-8 bytes without control characters")
    return value


def _number(value, field, low, high):
    """Finite number in the closed range [low, high]."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{field} must be a finite number")
    if not low <= value <= high:
        raise ValueError(f"{field} must be between {low} and {high}")
    return float(value)


def _reject_constant(token):
    raise ValueError(f"manifest contains non-finite number {token}")


def load_manifest(path):
    path = Path(path)
    if path.stat().st_size > MAX_MANIFEST_BYTES:
        raise ValueError("manifest exceeds 1 MiB")
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=_reject_constant)


def validate_manifest(data, manifest_dir):
    """Return a normalized manifest; raise ValueError before any scene mutation."""
    if not isinstance(data, dict) or set(data) - TOP_KEYS or not {"schema", "collection", "views"} <= set(data):
        raise ValueError("manifest requires schema, collection and views; optional opacity; no other keys")
    if data["schema"] != SCHEMA:
        raise ValueError(f"schema must be {SCHEMA}")
    collection = _name(data["collection"], "collection")
    opacity = _number(data.get("opacity", DEFAULT_OPACITY), "opacity", *OPACITY_RANGE)
    views = data["views"]
    if not isinstance(views, list) or not 1 <= len(views) <= MAX_VIEWS:
        raise ValueError(f"views must list 1..{MAX_VIEWS} reference views")
    object_names, result = set(), []
    for index, view in enumerate(views):
        label = f"views[{index}]"
        if not isinstance(view, dict) or set(view) - VIEW_KEYS or not REQUIRED_VIEW_KEYS <= set(view):
            raise ValueError(f"{label} requires {sorted(REQUIRED_VIEW_KEYS)}; optional crop; no other keys")
        name, camera = _name(view["name"], f"{label}.name"), _name(view["cameraName"], f"{label}.cameraName")
        for value in (name, camera):
            if value in object_names:
                raise ValueError(f"{label}: object name {value!r} is used more than once")
            object_names.add(value)
        if view["view"] not in VIEWS:
            raise ValueError(f"{label}.view must be one of {sorted(VIEWS)}")
        if not isinstance(view["image"], str) or not view["image"]:
            raise ValueError(f"{label}.image must be a local PNG path")
        image = (Path(manifest_dir) / view["image"]).resolve()
        if image.suffix.lower() != ".png" or not image.is_file():
            raise ValueError(f"{label}.image must be an existing .png file: {image}")
        width, height = read_png_info(image)
        crop = view.get("crop", [0, 0, width, height])
        if (not isinstance(crop, list) or len(crop) != 4
                or any(isinstance(v, bool) or not isinstance(v, int) for v in crop)):
            raise ValueError(f"{label}.crop must be four integer pixel edges [x0, y0, x1, y1]")
        x0, y0, x1, y1 = crop
        if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
            raise ValueError(f"{label}.crop {crop} is outside the {width}x{height} image or empty")
        if min(x1 - x0, y1 - y0) < MIN_CROP_PIXELS:
            raise ValueError(f"{label}.crop {crop} must be at least {MIN_CROP_PIXELS} pixels on each side")
        center = view["center"]
        if not isinstance(center, list) or len(center) != 3:
            raise ValueError(f"{label}.center must be [x, y, z]")
        result.append(dict(
            index=index, name=name, cameraName=camera, view=view["view"], image=image,
            imageSize=(width, height), crop=(x0, y0, x1, y1),
            center=tuple(_number(v, f"{label}.center", -COORDINATE_LIMIT, COORDINATE_LIMIT) for v in center),
            verticalSpan=_number(view["verticalSpan"], f"{label}.verticalSpan", *SPAN_RANGE),
        ))
    return dict(collection=collection, opacity=opacity, views=result)


def validate_paths(input_path, output_path, evidence_dir=None):
    source, output = Path(input_path).resolve(), Path(output_path).resolve()
    if source.suffix.lower() != ".blend" or not source.is_file():
        raise ValueError(f"--input must be an existing .blend file: {source}")
    if output.suffix.lower() != ".blend" or output == source:
        raise ValueError("--output must be a different .blend path")
    if output.exists() or not output.parent.is_dir():
        raise ValueError(f"--output must be a new file in an existing directory: {output}")
    evidence = Path(evidence_dir).resolve() if evidence_dir else output.with_name(output.stem + "_reference_board")
    if evidence.exists() or not evidence.parent.is_dir():
        raise ValueError(f"evidence directory must be new, in an existing directory: {evidence}")
    return source, output, evidence


def plan_view(view, scene_radius):
    """Physical guide size and camera placement for one validated view."""
    x0, y0, x1, y1 = view["crop"]
    width_px, height_px = x1 - x0, y1 - y0
    span = view["verticalSpan"]
    width = span * width_px / height_px
    basis = VIEWS[view["view"]]
    distance = max(scene_radius, 0.0) + span
    center = view["center"]
    return dict(
        pixelSize=(width_px, height_px), physicalSize=(width, span),
        # An image empty's longest side equals its display size.
        displaySize=max(width, span),
        cameraLocation=tuple(c - f * distance for c, f in zip(center, basis["forward"])),
        rotationEuler=basis["euler"], orthoScale=span,
        clipStart=span * 1e-2, clipEnd=distance + max(scene_radius, 0.0) + span,
        renderAspectForExactFrame=width_px / height_px,
    )


def _scene_radius(bpy, scene, center):
    from mathutils import Vector
    graph = bpy.context.evaluated_depsgraph_get()
    radius, origin = 0.0, Vector(center)
    for obj in scene.objects:
        if obj.type in BOUNDED_TYPES:
            evaluated = obj.evaluated_get(graph)
            for corner in evaluated.bound_box:
                radius = max(radius, ((evaluated.matrix_world @ Vector(corner)) - origin).length)
    return radius


def _settings(scene):
    render, view = scene.render, scene.view_settings
    return dict(
        camera=scene.camera.name if scene.camera else None, engine=render.engine,
        resolution=[render.resolution_x, render.resolution_y, render.resolution_percentage],
        pixelAspect=[render.pixel_aspect_x, render.pixel_aspect_y], filmTransparent=render.film_transparent,
        frames=[scene.frame_start, scene.frame_current, scene.frame_end],
        colorManagement=[view.view_transform, view.look, view.exposure, view.gamma],
    )


def _crop_to_png(bpy, view, target):
    import numpy as np
    source = bpy.data.images.load(str(view["image"]), check_existing=False)
    generated = loaded = None
    try:
        width, height = view["imageSize"]
        if tuple(source.size) != (width, height):
            raise ValueError(f"{view['image'].name}: Blender decoded {tuple(source.size)}, header says {(width, height)}")
        channels = source.channels
        pixels = np.empty(width * height * channels, dtype=np.float32)
        source.pixels.foreach_get(pixels)
        x0, y0, x1, y1 = view["crop"]
        # Manifest rows count from the top; Blender rows count from the bottom.
        region = pixels.reshape(height, width, channels)[height - y1:height - y0, x0:x1]
        rgba = np.ones(region.shape[:2] + (4,), dtype=np.float32)
        if channels in (3, 4):
            rgba[..., :channels] = region
        elif channels in (1, 2):  # gray (+ alpha)
            rgba[..., :3] = region[..., :1]
            if channels == 2:
                rgba[..., 3] = region[..., 1]
        else:
            raise ValueError(f"{view['image'].name}: unsupported channel count {channels}")
        generated = bpy.data.images.new("bas_reference_crop", x1 - x0, y1 - y0, alpha=True, float_buffer=False)
        generated.pixels.foreach_set(rgba.ravel())
        generated.filepath_raw = str(target)
        generated.file_format = "PNG"
        generated.save()
        bpy.data.images.remove(generated)
        generated = None
        loaded = bpy.data.images.load(str(target), check_existing=False)
        written = np.empty(rgba.size, dtype=np.float32)
        if loaded.channels != 4:
            raise ValueError(f"{target.name}: expected an RGBA crop")
        loaded.pixels.foreach_get(written)
        if not np.array_equal(written, rgba.ravel()):
            raise ValueError(f"{target.name}: written crop pixels differ from the source region")
        loaded.name = view["name"]
        if loaded.name != view["name"]:
            raise ValueError(f"image name {view['name']!r} is unavailable")
        # Pack the verified PNG bytes so the output stays self-contained when moved.
        loaded.pack()
        packed = loaded.packed_file
        if packed is None or hashlib.sha256(bytes(packed.data)).hexdigest() != sha256_file(target):
            raise ValueError(f"{target.name}: packed guide does not match the written crop file")
        return loaded
    except Exception:
        if loaded is not None:
            bpy.data.images.remove(loaded)
        raise
    finally:
        bpy.data.images.remove(source)
        if generated is not None:
            bpy.data.images.remove(generated)


def build(args):
    import bpy
    source, output, evidence = validate_paths(args.input, args.output, args.evidence_dir)
    manifest_path = Path(args.manifest).resolve()
    manifest = validate_manifest(load_manifest(manifest_path), manifest_path.parent)
    input_sha = sha256_file(source)
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    names = [(bpy.data.collections, manifest["collection"], "collection")]
    for view in manifest["views"]:
        names += [(bpy.data.objects, view["name"], "object"), (bpy.data.objects, view["cameraName"], "object"),
                  (bpy.data.cameras, view["cameraName"], "camera data"), (bpy.data.images, view["name"], "image")]
    taken = [f"{kind} {name!r}" for collection, name, kind in names if collection.get(name) is not None]
    if taken:
        raise ValueError("refusing to replace existing data: " + ", ".join(taken))
    before = _settings(scene)
    plans = [plan_view(view, _scene_radius(bpy, scene, view["center"])) for view in manifest["views"]]

    created = []
    try:
        evidence.mkdir()
        created.append(evidence)
        records = []
        board = bpy.data.collections.new(manifest["collection"])
        scene.collection.children.link(board)
        board.hide_render = True
        for view, plan in zip(manifest["views"], plans):
            target = evidence / f"{view['index']:02d}-{view['view']}.png"
            image = _crop_to_png(bpy, view, target)
            camera_data = bpy.data.cameras.new(view["cameraName"])
            camera_data.type, camera_data.sensor_fit = "ORTHO", "VERTICAL"
            camera_data.ortho_scale = plan["orthoScale"]
            camera_data.clip_start, camera_data.clip_end = plan["clipStart"], plan["clipEnd"]
            camera = bpy.data.objects.new(view["cameraName"], camera_data)
            camera.location, camera.rotation_euler = plan["cameraLocation"], plan["rotationEuler"]
            guide = bpy.data.objects.new(view["name"], None)
            guide.empty_display_type, guide.data = "IMAGE", image
            guide.empty_display_size, guide.empty_image_offset = plan["displaySize"], (-0.5, -0.5)
            guide.location, guide.rotation_euler = view["center"], plan["rotationEuler"]
            guide.use_empty_image_alpha, guide.color = True, (1.0, 1.0, 1.0, manifest["opacity"])
            guide.empty_image_depth, guide.empty_image_side = "BACK", "FRONT"
            guide.show_empty_image_orthographic = guide.show_empty_image_perspective = True
            guide.show_empty_image_only_axis_aligned = True
            guide.hide_render = guide.hide_select = True
            for obj in (camera, guide):
                board.objects.link(obj)
                obj["bas_reference_view"] = view["view"]
            if (camera.name, guide.name, camera_data.name) != (view["cameraName"], view["name"], view["cameraName"]):
                raise ValueError(f"Blender renamed reference data for {view['name']!r}")
            records.append(dict(
                name=view["name"], cameraName=view["cameraName"], view=view["view"],
                convention=VIEWS[view["view"]]["description"],
                source=dict(path=str(view["image"]), sha256=sha256_file(view["image"]), size=list(view["imageSize"])),
                crop=dict(box=list(view["crop"]), convention="[x0, y0, x1, y1] pixel edges; top-left origin; x1/y1 exclusive"),
                guideImage=dict(path=str(target), sha256=sha256_file(target), size=list(plan["pixelSize"]), pixelExact=True,
                                packed=image.packed_file is not None, packedBytes=image.packed_file.size,
                                packedSha256=hashlib.sha256(bytes(image.packed_file.data)).hexdigest(),
                                storedPath=image.filepath),
                center=list(view["center"]), verticalSpan=view["verticalSpan"],
                physicalSize=list(plan["physicalSize"]), emptyDisplaySize=plan["displaySize"],
                camera=dict(location=list(plan["cameraLocation"]), rotationEuler=list(plan["rotationEuler"]),
                            orthoScale=plan["orthoScale"], sensorFit="VERTICAL",
                            clip=[plan["clipStart"], plan["clipEnd"]],
                            renderAspectForExactFrame=plan["renderAspectForExactFrame"]),
            ))
        after = _settings(scene)
        if after != before:
            raise ValueError(f"scene camera/render settings changed unexpectedly: {before} -> {after}")
        if output.exists():
            raise ValueError(f"--output appeared during setup: {output}")
        bpy.ops.wm.save_as_mainfile(filepath=str(output), copy=True)
        created.append(output)
        if sha256_file(source) != input_sha:
            raise ValueError("input .blend changed during setup")
        report = dict(
            schema=REPORT_SCHEMA, status="created", blenderVersion=bpy.app.version_string,
            input=dict(path=str(source), sha256=input_sha),
            output=dict(path=str(output), sha256=sha256_file(output)),
            manifest=dict(path=str(manifest_path), sha256=sha256_file(manifest_path)),
            evidenceDir=str(evidence), collection=manifest["collection"], opacity=manifest["opacity"],
            units=dict(assumption=UNIT_ASSUMPTION, sceneLengthUnit=scene.unit_settings.length_unit,
                       sceneScaleLength=scene.unit_settings.scale_length),
            sceneSettingsPreserved=before, views=records,
            limitations=[
                "Places images exactly as declared; does not detect orientation, foreground, scale or proportions.",
                "Guides assume orthographic, axis-aligned reference images; perspective photos are not corrected.",
                "Camera frames match a guide only when the render aspect equals renderAspectForExactFrame; render settings were not changed.",
                "Guides are viewport-only evidence; they are not geometry, masks or proof of shape agreement.",
            ],
        )
        with open(evidence / "reference-board.json", "x", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2)
        return report
    except Exception:
        for path in reversed(created):
            if path.is_dir():
                for child in path.iterdir():
                    child.unlink()
                path.rmdir()
            elif path.exists():
                path.unlink()
        raise


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Create an orthographic reference board in a new .blend.")
    parser.add_argument("--input", required=True, help="Existing .blend; read only.")
    parser.add_argument("--manifest", required=True, help=f"JSON manifest ({SCHEMA}).")
    parser.add_argument("--output", required=True, help="New .blend path; must not exist.")
    parser.add_argument("--evidence-dir", help="New directory for crops and report (default: <output stem>_reference_board).")
    return parser.parse_args(argv)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    report = build(parse_args(argv))
    print("REFERENCE_BOARD " + json.dumps(dict(output=report["output"], evidenceDir=report["evidenceDir"],
                                                 views=[v["name"] for v in report["views"]])))


if __name__ == "__main__":
    main()
