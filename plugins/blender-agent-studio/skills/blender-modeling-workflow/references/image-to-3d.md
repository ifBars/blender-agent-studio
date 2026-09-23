# Image-to-3D workflow

Treat an image as evidence with uncertainty, not a complete 3D specification.
This workflow uses authored geometry and bounded reference tools. It does not
add a reconstruction service or silently upload the user's images.

## Resolve what must match

Open all supplied views. Record image paths and hashes, subject identity,
visible silhouette, proportions, part count, negative spaces, material regions,
pose and camera cues. Separate observed features from inferred depth and hidden
surfaces. Label a style reference separately from a shape reference.

If unclear, ask whether the user wants a faithful reconstruction, a stylized
adaptation or a render from the pictured viewpoint; these have different
acceptance criteria. Ask about conflicting references or hidden structure only
when the choice changes a major feature or intended use. Do not invent precise
real-world scale from a photograph without a known dimension. Use stated scale
assumptions for noncritical presentation work.

Create `reference_notes.md` with each binding requirement, the image/view that
supports it, uncertainty and the evidence needed to accept it. Generated
turnarounds are design hypotheses, not independent measurements of the subject.

## Separate camera error from shape error

1. Build primary masses and a named camera for each reference. Check crop,
   aspect, perspective versus orthographic projection, pose and orientation.
2. Use separated, identifiable landmarks. With a plausible camera pose,
   `blender_fit_reference_camera` fits focal length/scale and lens shift only;
   it does not solve camera pose, geometry or occlusion. Reject degenerate or
   uncertain correspondences rather than claiming calibrated reconstruction.
3. Review the candidate overlay and retain accepted camera parameters in source.
   Freeze image, crop, frame, pose, camera and any reviewed silhouette mask for
   geometry comparisons. If camera evidence changes, establish a new baseline.
4. Use `blender_compare_reference` to inspect the largest outline, spacing and
   landmark errors. Correct shared camera error before distorting geometry.
   Correct local shape when a particular feature remains wrong.
5. Inspect an independent side/rear/three-quarter view after each primary-form
   change. Preserve depth, thickness and attachments; a flat cutout can match
   one silhouette perfectly. A photograph's brightness is not a subject mask.

## Accept the result against the request

Use SceneIR at the same explicit frame to check grounded dimensions and authored
construction anchors. Bounds and roles alone do not verify anatomy or contact.
Review materials separately from opaque silhouette passes. Validate the full
requested asset, including inferred surfaces, neutral views and fresh imports
when an export is required. For a rigged character, repeat the form review in
the requested poses; for a single-shot render, do not invent a runtime rig.

Deliver the editable source, contract-to-evidence checklist, reference overlays,
complementary views and the requested artifact. Report which features match,
which remain inferred, and which could not be checked. Never report one-view
IoU or landmark accuracy as overall 3D quality.
