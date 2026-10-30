# Calibrated proportions and facial likeness

Preserve the previous deliverable and work from a new source revision. Technical
export validity and silhouette overlap cannot establish facial identity.

## Freeze a coherent target

Choose one primary character, outfit, source series and expression. Game models,
collectible sculptures and promotional paintings may disagree on proportions;
label supplemental references by the feature they support. Generated angles can
guide an original design, but cannot verify an existing character's unseen form.

Open references and record image/crop hashes, dimensions, pose, expression,
source and uncertain features. Review masks and named 2D/3D correspondences.
Occluded points and low-resolution guesses are uncertain evidence. Do not use
clothing outlines as skeletal joint centers without recording that approximation.

## Separate alignment from geometry

1. Author a plausible reference camera and match the evaluation pose. Preserve
   the neutral model separately. An arm angle is not a limb-length error.
2. Use `blender_fit_reference_camera` in `pose` mode for bounded rigid camera
   motion with intrinsics fixed. Supply well-spread landmarks and independent
   `heldoutLandmarks`. Inspect conditioning, bounds and held-out residuals.
3. If needed, use the separate `framing` mode for focal length/orthographic scale
   and lens shift. Uncertain focal length and depth can compensate for each other;
   do not repeatedly alternate camera and geometry to chase a lower error.
4. Review the overlay, retain the accepted camera in durable source, then freeze
   camera, image/crop, evaluation pose, frame and reference landmark targets.
   Regenerate baseline snapshots using this setup before changing shape.
   A later alignment change requires a new baseline.

A fit against inaccurate model points is an alignment candidate, not recovered
ground-truth calibration. The tool does not pose the character, infer landmarks
or test occlusion. Improve the starting camera or correspondences when a solve
is ill-conditioned or bound-limited; do not just enlarge bounds until it fits.

Validate the evaluation pose itself. A rigid head turn must move skull, eyes,
brows and hair together; confine blended rotation to the neck transition rather
than shearing the side of the skull. Recompute anchors from the evaluated
features. Do not refit head translation, camera or scale after each shape edit
and attribute the resulting score change to geometry. Keep camera-uncertainty
bands when several plausible setups yield similar fit errors.

## Body and face snapshots

Keep body front, profile, back and three-quarter checks. Compare head/body size,
shoulder/hip width, torso/leg length, joints and garment volume. Projected ratios
remain view-dependent, not anatomical 3D measurements.

Give the head separate front, both three-quarter and profile cameras, filling
most of each image with margin. A face cropped from a body thumbnail is too
small. Preserve lighting, framing and color management between revisions. Save
neutral clay, base-colour and final shaded passes, plus eye/lid, nose/mouth and
hairline close-ups where useful. Show reference, baseline and candidate together.
Do not independently realign each feature or stretch the candidate image.
Match the reference expression; retain neutral views as structural checks.

Review eye corners and lid extrema, iris centers when gaze matches, brow peaks,
nose bridge/tip/alar edges, lip corners/contours, chin and cheek/jaw outlines.
Treat gaze and expression separately from identity. A silhouette point moves
over the surface as the camera turns; one vertex is not necessarily the same
visible contour feature in every view.

Record landmark extraction rules and their version. A rule such as the deepest
point below the nose can jump onto the lip after a sculpt; inspect its actual
surface attachment before treating the residual as anatomical error. If the
rule changes, re-extract both baseline and candidate under the same rule or
exclude that point and disclose the comparison change. Painted lip borders,
geometric lip edges and mouth closure are different measurements.

## Repair and retain evidence

Use connected head topology and semantic sculpt layers, shape keys or bounded
deformation parameters. Fit eyes and lids together. Inspect lid thickness, lip
closure, cheek planes, profile depth and jaw/neck continuity. Extra makeup or
polygons cannot repair an inaccurate face. Establish hair flow, fringe and
primary masses before strand detail; correct width can still make a helmet.

Each pass records a specific hypothesis, source/parameter change, baseline and
candidate hashes, opened snapshots, numerical deltas, visual verdict and
retain/reject decision. Check complementary views and independent landmarks.
Keep failed candidates and the best accepted version. A validation view used
to choose edits is no longer an unseen test. Reserve unused final evidence
where available. Recheck full-body appearance and fresh export after head edits.
Track pose-fit, shape-fit and validation membership separately: a landmark
excluded from camera fitting but used to choose a sculpt is not independent
validation of that sculpt. Near-duplicate frontal frames cannot validate profile
depth. Report annotation noise relative to the chosen normalization length;
do not claim precision finer than the reference can support.

## Review declared numerical targets

The standard-library helper
`blender-asset-validation/scripts/review_likeness.py` compares pairs of
`blender_compare_reference` reports. It rejects changed cameras, references,
masks, resolution, frame or reference landmark targets. It recomputes normalized
landmark errors and declared projected ratios, and reports before/after deltas.
It does not render, annotate, calibrate or decide aesthetic acceptance.

Example manifest, with paths relative to the manifest:

```json
{
  "schema": "bas-likeness-review/0.1",
  "targets": {"min_iou": 0.95, "max_landmark_error": 0.02, "max_proportion_error": 0.03},
  "views": [{
    "name": "head-three-quarter", "region": "face", "role": "validation",
    "baseline": "baseline/head/comparison.json",
    "candidate": "iteration-02/head/comparison.json",
    "referenceSha256": "REPLACE_WITH_64_CHARACTER_INTAKE_IMAGE_HASH",
    "maskSha256": "REPLACE_WITH_64_CHARACTER_REVIEWED_MASK_HASH",
    "alignmentReviewed": true,
    "alignmentEvidence": "calibration/review.md",
    "landmarksReviewed": true,
    "normalization": {"label": "reference face height", "referenceLandmarks": ["forehead", "chin"]},
    "proportions": [{
      "name": "eye spacing / face height",
      "numerator": ["inner-eye-left", "inner-eye-right"],
      "denominator": ["forehead", "chin"]
    }]
  }]
}
```

```text
python plugins/blender-agent-studio/skills/blender-asset-validation/scripts/review_likeness.py --manifest C:/reviews/likeness.json --output C:/reviews/iteration-02-review.json
```

Add an entry for every required body/head view. `region` is a reviewer label,
not segmentation. Replace the example hashes with pinned intake hashes, before
making geometry changes (`maskSha256: null` if no mask). Anchors must follow
the same semantic mesh features after edits; inspect their attachment and
source. Freezing their local coordinates would be wrong when the feature itself
moves. The helper cannot certify semantic correspondence. For an independent head silhouette, author a head reference
and matching scene visibility with unclipped margins. Normalization length is
derived from the two named reference landmarks at report resolution. Optional
`pixels` must agree within half a pixel with the selected pair. This rejects
a mismatched numeric override, not a semantically inappropriate or deliberately
distant landmark pair. The reviewer must verify that the anchors measure the
named body/head dimension; the helper cannot certify that semantic choice.
`alignmentEvidence` is a reviewer-supplied provenance note/path; the helper does
not certify its contents. Report uncertainty rather than marking it reviewed
merely to obtain a pass.

Example targets mean >=0.95 silhouette IoU in each declared view, <=2% normalized
error for every declared landmark, and <=3% relative error for each declared
proportion. These are proposed operational targets, not a validated definition
of 95% likeness. The following produce `unverified`: no reviewed silhouette
mask, insufficient visible landmarks, unreviewed alignment, cropped or unknown
framing, an unmeasurable projected proportion, or no validation view. Invalid contracts
(including missing normalization anchors) are rejected. Duplicate reference
images cannot count twice as independent coverage, even if the camera is renamed.
Proportions are optional; omission
does not certify proportions that were never declared.

The report lists regressions even when targets remain met. Retention is never
automated. Top-level flags identify regressions and targets looser than the
example; raw pixel errors and the normalization length remain visible.
Even `targets_met` covers only declared projections. Wrong eyelids, expression,
planes or shading may pass an outline check. Keep the facial feature ledger
and visual acceptance separate, with unchanged technical/export invariants.
Two manually refined characters do not demonstrate reliability across runs.
