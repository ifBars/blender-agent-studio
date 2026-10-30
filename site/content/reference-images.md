---
title: Reference images
description: Match a camera to a reference image, then compare the model's silhouette against it.
---

`blender_compare_reference` renders your current geometry through a camera you author and returns one board: the reference, the model's silhouette, and an overlay. Proportion errors become visible without switching between files. It doesn't need the Rust runtime.

## Match the view first

1. **Study the reference.** Note its crop, perspective, pose, major widths and heights, negative spaces, and visible connections. A single photo doesn't define the back or the depth.
2. **Block out and add a camera.** Build the primary masses in bpy and add a named camera that matches the reference: orthographic for drawings, perspective for photos.
3. **Compare.** Save the `.blend` and call the tool at 256 or 512 pixels.
4. **Fix the largest mismatch.** Change the source, regenerate, and compare into a new directory with the same camera and crop. Check another angle before accepting an ambiguous depth change.
5. **Then refine.** Materials and topology come after the primary form matches.

```json
{
  "assetPath": "C:/assets/subject.blend",
  "referencePath": "C:/references/front.png",
  "cameraName": "ReferenceFront",
  "outputDir": "C:/reviews/front-iteration-01",
  "maxEdge": 256
}
```

Without `cameraName`, the active camera is used. The tool respects authored visibility, so hide staging floors and unrelated objects.

## Silhouette measurements

Add `maskPath` for a reviewed silhouette mask: a white subject on black, at the reference's exact dimensions. The overlay then shows shared coverage in green, missing model coverage in pink, and excess in cyan. The report adds intersection-over-union and missing and excess pixel counts.

Photos aren't masks, and the tool never thresholds one. Without a mask, metrics are null and the overlay is for visual review only.

## Landmarks

For points you can identify in both, such as a hinge, a tip, or a corner, pass named correspondences. `referenceUv` is normalized from the image's top-left corner; `localPoint` is object-local and defaults to the origin.

```json
{
  "landmarks": [
    { "name": "hinge", "objectName": "HingeAnchor", "referenceUv": [0.32, 0.45] },
    { "name": "tip", "objectName": "Handle", "localPoint": [0, 0, 1], "referenceUv": [0.6, 0.2] }
  ]
}
```

The report returns a signed pixel offset for each point. With 3 to 32 landmarks, `blender_fit_reference_camera` fits focal length and lens shift into a candidate `.blend`, keeping the camera pose and geometry fixed. Compare again before keeping the new values.

## Calibrate camera pose separately

The default `mode: "framing"` retains the behavior above. Optional `mode: "pose"`
fits bounded camera rotation and translation while keeping lens, shift and
orthographic scale fixed. Supply well-spread landmarks and independent
`heldoutLandmarks`; the latter are measured but never optimized. The report
records residuals, conditioning, bounds and warnings. A low training error
alone does not establish camera accuracy or likeness. Character pose and
geometry stay unchanged.

```json
{
  "mode": "pose",
  "poseBounds": {"maxRotationDeg": 15, "maxTranslationRatio": 0.25},
  "heldoutLandmarks": [
    {"name": "independent-tip", "objectName": "TipAnchor", "referenceUv": [0.7, 0.3]}
  ]
}
```

Add these fields to a camera-fit request with at least four training landmarks;
prefer six or more well-spread correspondences. Start from a plausible view.
Orthographic depth along the view axis is unobservable and stays fixed. Review
the candidate, retain accepted camera parameters in source, then freeze camera,
pose, references and masks before comparing a geometry revision. A changed
camera requires a new baseline.

## Refine character likeness with retained snapshots

Use separate body and tightly framed head views. Keep front, profile and
three-quarter evidence, including clay, base-colour and shaded face snapshots.
Use one primary reference series and match expression; a statue and illustrated
portrait may disagree with the in-game face. Keep eye/lid and nose/mouth detail
visible rather than judging identity from a full-body thumbnail.

The standard-library `review_likeness.py` helper in the validation skill compares
before/after `comparison.json` reports. It rejects changed comparison conditions,
recomputes normalized landmark errors and measures declared projected ratios.
It reports each view separately, with no overall likeness percentage. Missing
alignment review, masks, landmark evidence or validation coverage remains
unverified. A passing outline cannot excuse inaccurate eyes or expression.

See the [likeness refinement protocol](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-character-workflow/references/likeness-refinement.md)
for the manifest, example 0.95 overlap / 2% landmark / 3% proportion targets,
snapshot protocol and retain/reject loop. These are explicit operational targets,
not a promise of 95% identity or consistent reconstruction quality.

## Limits

- One matching projection can hide a bad 3D model. Check complementary views and a normal multiview render.
- Keep the camera, crop, and mask fixed while judging an edit. Changing them makes scores incomparable.
- The comparison tool doesn't reconstruct meshes, estimate camera pose, segment photos, or repair anything. Camera fitting is a separate explicit tool. Transparent materials render opaque in the comparison pass.

The [reference modeling guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/reference-modeling.md) has the full report format.
