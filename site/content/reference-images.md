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

## Limits

- One matching projection can hide a bad 3D model. Check complementary views and a normal multiview render.
- Keep the camera, crop, and mask fixed while judging an edit. Changing them makes scores incomparable.
- The tool doesn't reconstruct meshes, estimate camera pose, segment photos, or repair anything. Transparent materials render opaque in this pass.

The [reference modeling guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/reference-modeling.md) has the full report format.
