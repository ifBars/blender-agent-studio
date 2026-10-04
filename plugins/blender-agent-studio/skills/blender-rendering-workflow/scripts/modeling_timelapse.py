"""Opt-in build checkpoints. Import inside Blender; rendering happens afterwards.

Recording = ModelingTimelapse('progress', enabled=RECORD_TIMELAPSE)
Recording.capture('Primary forms')
Recording.capture('Materials and final lighting', final=True)
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

import bpy


class ModelingTimelapse:
    def __init__(self, directory, *, enabled=False):
        self.enabled = enabled
        self.entries = []
        self.finished = False
        if not enabled:
            return
        self.directory = Path(directory).resolve()
        scene = bpy.context.scene
        geometry = [o for o in scene.objects if o.type in {'MESH', 'CURVE', 'SURFACE', 'FONT', 'META', 'VOLUME'}]
        if geometry and not (len(geometry) == 1 and geometry[0].name == 'Cube'
                             and geometry[0].type == 'MESH'
                             and len(geometry[0].data.vertices) == 8
                             and len(geometry[0].data.polygons) == 6
                             and set(tuple(v.co) for v in geometry[0].data.vertices) ==
                                 {(x, y, z) for x in (-1.0, 1.0) for y in (-1.0, 1.0) for z in (-1.0, 1.0)}
                             and tuple(geometry[0].location) == (0.0, 0.0, 0.0)
                             and tuple(geometry[0].rotation_euler) == (0.0, 0.0, 0.0)
                             and tuple(geometry[0].scale) == (1.0, 1.0, 1.0)
                             and not geometry[0].modifiers):
            raise ValueError('Start timelapse capture before modeling, in an empty or default scene')
        # A new directory avoids mixing iterations or overwriting prior evidence.
        self.directory.mkdir(parents=True, exist_ok=False)
        self.capture('Default scene' if geometry else 'Empty scene', kind='initial')

    def capture(self, label, *, final=False, kind='checkpoint'):
        if not self.enabled:
            return None
        if self.finished:
            raise ValueError('The final checkpoint has already been recorded')
        if not isinstance(label, str) or not 1 <= len(label.strip()) <= 160:
            raise ValueError('Checkpoint label must have 1..160 characters')
        if len(self.entries) >= 64:
            raise ValueError('At most 64 checkpoints are supported')
        if len(self.entries) == 63 and not final:
            raise ValueError('The last checkpoint slot is reserved for the final scene')
        if kind != ('initial' if not self.entries else 'checkpoint'):
            raise ValueError('Only the first checkpoint can be initial')
        if final and len(self.entries) < 2:
            raise ValueError('Capture at least one modeling milestone before the final scene')
        path = self.directory / f'{len(self.entries):03d}.blend'
        if path.exists():
            raise FileExistsError(path)
        # copy leaves the working filepath intact; relative_remap preserves dependencies.
        result = bpy.ops.wm.save_as_mainfile(filepath=str(path), copy=True, compress=True,
                                            relative_remap=True, check_existing=False)
        if 'FINISHED' not in result:
            raise RuntimeError(f'Checkpoint save failed: {result}')
        self.entries.append({
            'label': label.strip(), 'kind': 'final' if final else kind,
            'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'capturedAt': datetime.now(timezone.utc).isoformat(),
            'scene': bpy.context.scene.name, 'frame': bpy.context.scene.frame_current,
            'objectCount': len(bpy.context.scene.objects),
        })
        self.finished = final
        manifest = {'schemaVersion': 1, 'status': 'complete' if final else 'recording',
                    'capture': 'authored_build_checkpoints', 'checkpoints': self.entries}
        temporary = self.directory / 'capture.json.tmp'
        temporary.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        temporary.replace(self.directory / 'capture.json')
        return path
