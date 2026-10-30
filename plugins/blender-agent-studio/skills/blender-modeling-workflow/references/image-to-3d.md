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

## Set up axis-aligned reference guides

For orthographic front, back or side references, `scripts/setup_reference_board.py`
adds viewport-only image guides and matching orthographic cameras to a new
`.blend`. It does not overwrite the input file.

```text
blender --background --factory-startup --disable-autoexec --threads 2 --python-exit-code 1 --python setup_reference_board.py -- \
  --input model.blend --manifest board.json --output model_refs.blend [--evidence-dir new_dir]
```

The manifest (`bas-reference-board/0.1`) names a collection and lists up to 8
views. Each view needs:

- an 8-bit PNG and an optional pixel crop `[x0, y0, x1, y1]`, measured from the
  top-left corner with exclusive right and bottom edges;
- `view`: `front`, `back`, `left` or `right`;
- `name` for the image empty and `cameraName` for the camera;
- `center`, the subject's world-space centre;
- `verticalSpan`, the height the crop covers, in scene units (assumed to be meters).

```json
{"schema": "bas-reference-board/0.1", "collection": "Reference Board", "views": [
  {"name": "Ref_Profile", "cameraName": "RefCam_Right", "view": "right", "image": "sheet.png",
   "crop": [410, 0, 740, 920], "center": [0, 0, 0.92], "verticalSpan": 1.84}]}
```

View names give the camera position, as in Blender's numpad views:

| View | Camera position | Looks toward | Image right |
| --- | --- | --- | --- |
| `front` | -Y | +Y | +X |
| `back` | +Y | -Y | -X |
| `right` | +X | -X | +Y |
| `left` | -X | +X | -Y |

For a subject facing -Y, a profile with the nose pointing to image left is a
`right` view. Decide each view's side, centre and span from the reference
before you run the helper. It does not guess orientation, foreground, scale or
proportions.

What the helper does:

- **Before changing anything:** validates the manifest, PNG headers, crops, the
  16-megapixel limit and name uniqueness. It refuses names that already exist
  in the file and an output path or evidence directory that already exists.
- **Limits:** crops must be at least 16 pixels on each side. `verticalSpan`
  must be 0.001-10,000 scene units, opacity 0.05-1 and centre coordinates
  within ±1,000,000.
- **EXIF:** PNG EXIF without an Orientation tag, or with Orientation 1, is
  accepted. Any other orientation, or EXIF that cannot be read, is rejected:
  Blender uses the stored pixels and ignores rotation and flip metadata.
- **Crops:** copies each crop pixel-for-pixel into the new evidence directory
  and checks the copy is exact. It then packs those PNG bytes into the output
  `.blend`, so the guides still work after the file is moved. The crop files,
  their hashes and each image's stored path stay in the report.
- **Image guides:** sizes each image empty to `verticalSpan` × crop aspect by
  `verticalSpan`, faces it toward its camera and draws it behind geometry at
  0.35 opacity. Guides are hidden from renders and selection.
- **Cameras:** fits each camera vertically to `verticalSpan`. Render settings
  and the active camera are left unchanged, so a camera frames its crop
  exactly only when the render aspect matches the reported value.
- **Report:** `reference-board.json` records the source, crop, output and
  manifest hashes, the unit assumption and each camera's placement.

Guides are evidence for alignment, not proof of shape agreement. Continue with
the comparison steps below.

## Separate camera error from shape error

1. Build primary masses and a named camera for each reference. Check crop,
   aspect, perspective versus orthographic projection, pose and orientation.
2. Use separated, identifiable landmarks. With a plausible camera pose,
   `blender_fit_reference_camera` defaults to focal length/scale and lens shift.
   Its optional `pose` mode fits bounded rigid camera motion with fixed
   intrinsics; supply independent `heldoutLandmarks` and review conditioning,
   residuals and bound warnings. Neither mode solves character pose, geometry
   or occlusion. Reject degenerate or uncertain correspondences rather than
   claiming calibrated reconstruction.
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
