---
name: blender-rendering-workflow
description: Build, diagnose, and deliver Blender still, turntable, sequence, and animation renders with reproducible lighting, camera, color-management, compositor, and output settings. Use when a request concerns product visualization, cinematic shots, architectural renders, look development, render passes, denoising, compositing, or final image/video delivery.
---

# Blender Rendering Workflow

Treat a render as a reproducible deliverable, not a screenshot that happened to
look acceptable once.

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
