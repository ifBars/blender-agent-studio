# Optional modeling timelapse

Enable this when the user asks to see how the asset or scene was built. Capture
starts before modeling; it cannot be recovered from a final .blend alone.
Ordinary jobs keep it off and incur no checkpoint saves, rendering or encoding.

## Record actual stages

The helper `scripts/modeling_timelapse.py` saves copies without changing the
working .blend filepath. Import it from this skill's scripts directory in the
durable build source. For example:

```python
import sys
from pathlib import Path

RECORD_TIMELAPSE = '--timelapse' in sys.argv
progress = None
if RECORD_TIMELAPSE:
    sys.path.insert(0, str(Path(RENDERING_SKILL_ROOT) / 'scripts'))
    from modeling_timelapse import ModelingTimelapse
    progress = ModelingTimelapse('progress', enabled=True)

def checkpoint(label, final=False):
    if progress:
        progress.capture(label, final=final)

# Now clear the default objects and build the actual scene.
# ... authored layout / primary forms ...
checkpoint('Layout and primary forms')
# ... real structural refinement ...
checkpoint('Refined geometry')
# ... actual materials, lights and camera ...
checkpoint('Materials, lighting and completed scene', final=True)
```

Set `RENDERING_SKILL_ROOT` to the resolved rendering skill directory. Keep the
flag disabled for clean reproduction unless progress capture is explicitly
part of that reproduction. If portability outside the installed plugin is
required, deliver a copy of the helper alongside the source and import locally.

The recorder saves the starting empty/default scene automatically. Invoke it
before modifying that scene. Capture meaningful real milestones: layout,
primary forms, structural refinement, materials, dressing and final lighting,
as appropriate to the asset. Use roughly 6–16 stages for a useful short video;
the supported range is 3–64 including initial and final. Call the final capture
only after the completed scene has an active authored camera. Save/pack needed
textures and retain simulation caches. Do not construct fake earlier stages
by hiding objects in the finished scene or claim every modeling operation was
recorded. Failed/abandoned stages can remain visible if labeled accurately.

The capture directory must be new. Use a new directory for each rebuilt
recording, preserving earlier captures. A partial manifest stays `recording`
and cannot be presented as a completed timelapse.

## Render and deliver

After the final scene is complete, call `blender_render_modeling_timelapse` with
`manifestPath: ".../progress/capture.json"` and a new `outputDir`. Default output
is a 720px longest-edge, 24 fps MP4 holding each stage for one second. Controls:
`maxEdge` 128–1920, `samples` 1–128, `secondsPerStep` 0.25–5, `fps` 24/30/60,
and `timeoutMs` up to 30 minutes for the entire rendering/encoding operation.
Blender renders stages sequentially; FFmpeg must be on PATH or provided via
`FFMPEG_EXECUTABLE`. No arbitrary Python is accepted by the tool.

Skills-only equivalent, from the plugin directory:

```powershell
bun scripts/modeling-timelapse.ts --manifest C:/work/progress/capture.json `
  --output-dir C:/work/timelapse --max-edge 720 --samples 16
```

Deliver `modeling-timelapse.mp4`, `timelapse.json`, the labeled PNG stages under
`frames/`, and the original scene/source. Open the stage images and play the
video or inspect encoded samples before describing it as checked. The native
MCP viewer shows the labeled stages; the full video is a local file handoff.

## What the video shows

This is a chronological sequence of **real authored build checkpoints**, not
a recording of Blender's interface or elapsed typing time. Checkpoints retain
geometry and materials as they existed, with source hashes and capture times.
The video uses the final camera and aspect ratio throughout. Earlier stages
borrow the final lights/world for a readable comparison; the completed stage
uses its own authored lighting. These preview substitutions are recorded in
the manifest. The rendered resolution/sample budget is bounded and may differ
from the final beauty render. External dependencies and simulation caches are
not historical snapshots; moving them can alter checkpoint appearance.

Recording adds disk usage and final rendering time. Capture is separate from
animation/turntable delivery and from quality scoring. If a benchmark requests
it, give every compared condition the same capture requirement and budget;
do not turn it on only for the plugin condition and compare unqualified times.
