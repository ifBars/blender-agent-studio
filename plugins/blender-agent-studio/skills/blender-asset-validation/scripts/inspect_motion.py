"""Bounded read-only samples of evaluated motion, deformation and bake metadata.

This is evidence of change, not a physical-plausibility or aesthetic evaluator.
Only explicit mesh targets are inspected. No baking and no source writes.
"""
import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inspect_asset import load_asset, script_args


def cache_files(directory):
    """Bound traversal, including directories; never follow directory symlinks."""
    import os
    root = Path(bpy.path.abspath(directory)).resolve() if directory else None
    if root is None or not root.is_dir():
        return dict(nonempty_files=0, truncated=False)
    visited, files = 0, 0
    pending = [root]
    while pending:
        with os.scandir(pending.pop()) as entries:
            for entry in entries:
                visited += 1
                if visited > 10_000:
                    return dict(nonempty_files=files, truncated=True)
                if entry.is_symlink():
                    continue
                if entry.is_dir(follow_symlinks=False):
                    pending.append(entry.path)
                elif entry.is_file(follow_symlinks=False) and entry.stat().st_size > 0:
                    files += 1
    return dict(nonempty_files=files, truncated=False)


def modifier_summary(obj):
    result = []
    for mod in obj.modifiers:
        item = dict(type=mod.type, enabled=bool(mod.show_viewport))
        if mod.type == 'FLUID':
            item['fluid_type'] = mod.fluid_type
            settings = mod.domain_settings
            if settings:
                item.update(domain_type=settings.domain_type,
                            cache_type=settings.cache_type,
                            frame_start=settings.cache_frame_start,
                            frame_end=settings.cache_frame_end,
                            baked_data=bool(settings.has_cache_baked_data),
                            baked_mesh=bool(settings.has_cache_baked_mesh),
                            use_mesh=bool(settings.use_mesh),
                            cache_files=cache_files(settings.cache_directory))
        if mod.type == 'CLOTH':
            cache = mod.point_cache
            item.update(baked=bool(cache.is_baked), frame_start=cache.frame_start,
                        frame_end=cache.frame_end)
        result.append(item)
    return result


def sample_motion(frames, names):
    if not 2 <= len(frames) <= 12 or frames != sorted(set(frames)):
        raise ValueError('Provide 2-12 distinct increasing frames')
    if any(type(frame) is not int or abs(frame) > 1_048_574 for frame in frames):
        raise ValueError('Invalid frame')
    if not 1 <= len(names) <= 8 or len(set(names)) != len(names):
        raise ValueError('Provide 1-8 distinct mesh targets')
    scene = bpy.context.scene
    targets = [scene.objects.get(name) for name in names]
    if any(obj is None or obj.type != 'MESH' for obj in targets):
        raise ValueError('Every target must be an exact mesh object in the active scene')
    if any(len(obj.modifiers) > 64 for obj in targets):
        raise ValueError('At most 64 modifiers per target')
    metadata = {obj.name: modifier_summary(obj) for obj in targets}
    samples = []
    for frame in frames:
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        objects, total_vertices = [], 0
        for obj in targets:
            evaluated = obj.evaluated_get(graph)
            mesh = evaluated.to_mesh()
            try:
                total_vertices += len(mesh.vertices)
                if total_vertices > 2_000_000 or len(mesh.polygons) > 2_000_000:
                    raise ValueError('Motion sample geometry limit exceeded')
                digest = hashlib.sha256()
                for vertex in mesh.vertices:
                    coords = [round(float(v), 6) for v in vertex.co]
                    if not all(math.isfinite(v) for v in coords):
                        raise ValueError('Non-finite evaluated geometry')
                    digest.update(struct.pack('<3d', *coords))
                matrix = [round(float(v), 6) for row in evaluated.matrix_world for v in row]
                if not all(math.isfinite(v) for v in matrix):
                    raise ValueError('Non-finite evaluated transform')
                objects.append(dict(name=obj.name, vertices=len(mesh.vertices),
                                    polygons=len(mesh.polygons), local_geometry_sha256=digest.hexdigest(),
                                    world_matrix=matrix))
            finally:
                evaluated.to_mesh_clear()
        samples.append(dict(frame=frame, objects=objects))
    return dict(schema_version=1, frames=frames, modifiers=metadata, samples=samples,
                limitations=[
                    'Viewport evaluated meshes at explicit samples; no guarantee between frames.',
                    'Geometry digest includes vertex order; change is not proof of useful deformation.',
                    'Bake flags and cache-file presence do not prove cache completeness or physical correctness.',
                    'Modifier evaluation memory is not bounded by the post-evaluation vertex limit.',
                ])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--frames', required=True)
    parser.add_argument('--targets', nargs='+', required=True)
    args = parser.parse_args(script_args())
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    if output.exists() or source == output:
        raise ValueError('Motion evidence output must be a new file')
    load_asset(source)
    report = sample_motion([int(value) for value in args.frames.split(',')], args.targets)
    digest = hashlib.sha256()
    with source.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    report.update(source=str(source), source_sha256=digest.hexdigest(),
                  blender_version=bpy.app.version_string)
    with output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, allow_nan=False, sort_keys=True)


if __name__ == '__main__':
    main()
