---
name: blender-rendering-workflow
description: Build, diagnose, and deliver Blender still, turntable, sequence, and animation renders with reproducible lighting, camera, color-management, compositor, and output settings. Use when a request concerns product visualization, cinematic shots, architectural renders, look development, render passes, denoising, compositing, or final image/video delivery.
---

# Blender Rendering Workflow

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Treat a render as a reproducible deliverable, not a screenshot that happened to
look acceptable once.

For architecture, daylight shafts or fabric-heavy scenes, read
[interiors and atmosphere](references/interiors-and-atmosphere.md).
For photorealistic materials or environment lighting, use
[scanned materials and HDRIs](references/poly-haven-materials.md): the bundled
Poly Haven search/download tools acquire verified CC0 maps at up to 8K. Author
the scene's important forms, but do not impose a from-scratch-only constraint
that reduces realism.

## Use the authored scene surface

Use `blender_render_scene` for final beauty renders and lighting diagnosis.
Call it with `inspectOnly: true` first when camera names, dependencies or render
settings are unknown. Then select existing `cameras` by exact name and optional
`frames`; at most 12 camera/frame combinations are allowed. The default uses the
active camera/frame, caps the longest edge at 1280 and Cycles samples at 64, and
automatically selects an available GPU with an explicit recorded CPU fallback.
Choose `device: "cpu"` or a specific backend when reproducibility requires it.
Use a fresh output directory for each run. Inspect the inline PNG and
`render-manifest.json`; errors are not successful evidence.

The standalone equivalent is bundled in this skill:

```powershell
& $env:BLENDER_EXECUTABLE --background --factory-startup --disable-autoexec `
  --python-exit-code 1 --python "<skill-root>/scripts/render_scene.py" -- `
  --input scene.blend --output-dir renders/preview-01 --max-edge 1280 --samples 64
```

This preserves authored lights, world, volumes, cameras, materials and color
management. `blender_render_evidence` deliberately replaces cameras and lighting;
use it for standardized geometry checks, not as an interior's final image.
Neither tool substitutes for authoring the scene in durable source.

## Establish the render contract

Before changing the scene, record:

- the intended audience, view distance, reference mood, and required story beat;
- still, turntable, image sequence, or video deliverable; resolution, frame
  range, frame rate, and output format;
- render engine, device assumptions, time/noise budget, and whether the result
  must match an engine or compositor downstream;
- required cameras, hero and diagnostic views, render passes, alpha, and color
  management requirements;
- which lights, world, materials, volumes, and compositor nodes are part of the
  authored result.

Keep these settings as named constants in the durable scene-generation script.
Do not use a viewport screenshot as final evidence when the request calls for a
rendered deliverable.

## Author for repeatability

1. Name cameras, lights, world nodes, view layers, render settings, and output
   nodes semantically.
2. Set engine, resolution, frame range, sampling, denoise policy, transparent
   film, and color-management explicitly; never rely on a startup-file default.
3. Frame the subject with a deliberate focal length and camera height before
   increasing samples or adding post-processing.
4. Light for form: establish key, fill, rim/background separation, contact
   shadow, and exposure before cosmetic effects. Keep enough neutral evidence
   lighting to expose intersections and texture failures.
5. Use render passes and compositor nodes only when they improve the requested
   result. Keep the uncomposited beauty output available for diagnosis.
6. For turntables and animated output, render a short low-cost preview first;
   then lock camera and lighting before the final frame range.
7. For a render farm or external engine, emit a self-contained handoff manifest
   listing Blender version, engine, device assumptions, assets, fonts, cache
   paths, frame range, and output settings.

## Iterate with evidence

For a normal asset handoff, include a polished hero presentation by default.
Use a backdrop that separates the asset silhouette, softer key/fill lighting,
controlled highlights, visible contact shadows, and framing that makes details
readable. Match the material colors and avoid white-on-white or blown-out studio
setups. Scale light power with squared scene dimensions when scaling distances
and emitter sizes together.

Use the validation renderer's `auto`, `neutral`, `dark`, or `light` presentation
as a starting point. Inspect the first image and adapt the preset or authored
studio when contrast, translucency, emission, or textures require it. When two
presentations fit distinct needs, deliver both with clear labels; do not make
the user choose a preset before producing an initial useful result. Keep the
fixed diagnostic views alongside the hero, and preserve explicitly requested
art direction. A studio render does not replace required in-context shots.

1. Render a low-sample diagnostic frame for every required camera.
2. Open the rendered images, not merely file-existence logs.
3. Check composition, silhouette separation, exposure, specular control,
   shadow grounding, color balance, texture scale, noise/fireflies, clipping,
   and whether the requested material reads correctly.
4. Correct scene, material, camera, or lighting causes before tuning denoise,
   bloom, depth of field, or grading to hide them.
5. Render final stills or a bounded preview sequence. Open a contact sheet and,
   for motion, the encoded video or sampled frames.

## Completion gate

Do not call a render complete until the source reproduces it in a clean Blender
process and the final output has been visually opened. Report exact output
paths, Blender and engine version, resolution, frame range, samples/denoise,
color management, passes, render duration, and any machine-specific limits.
Use `$blender-agent-studio:blender-asset-validation` for fixed multiview
geometry evidence; that evidence supplements rather than replaces the art
directed final render.
For glass around an emissive subject, validate the final engine rather than the
node graph alone. Keep transmission, alpha/blend behavior, refraction, exposure,
and bloom controlled so the enclosure reads as glass and the emissive subject
retains a distinct colored silhouette. An opaque or blown-white enclosure is a
render failure even when its material is technically transmissive.
