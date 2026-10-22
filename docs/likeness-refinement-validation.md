# Calibrated likeness refinement validation

This follow-up on PR #31 pairs Codex review with Claude Code Opus 5.5 modeling
passes for classic Jonesy and default Luna Snow. The software and model evidence
have different scopes. Passing software tests does not establish character
likeness, and a projected overlap score is not an identity percentage.

## Software checks

Commit `56993c44f4bf976d84b360b7cfd7a5ed92401d03` adds bounded camera pose
fitting alongside the existing framing fit. Pose mode fixes intrinsics and
supports independent held-out correspondences, rank and conditioning checks,
bounded movement, and a check against Blender's actual projection. Reports
retain the input correspondences, resolved world points, signed pixel errors
and a correspondence hash. Source geometry is preserved.

The offline `review_likeness.py` helper checks paired reference-comparison
reports against frozen camera, reference, mask, frame, resolution and landmark
contracts. It derives normalized landmark errors and projected ratios from
declared reference anchors, flags regressions, and refuses to interpret missing
or uncertain evidence as a pass. Duplicate reference-image hashes cannot count
as independent views. Its `overall_likeness` result is always `not_measured`.

Validation used Blender 5.2.2 LTS with bounded background execution:

- Full Bun suite: 98 passed, three platform-specific skips; 978 assertions.
- Standalone Python: 50 passed, 12 older Blender-Python-only construction cases
  skipped by system Python. The new subprocess-based Blender cases passed.
- Repository check, all 45 documentation tests and the 13-page build passed.
- [Hosted validation of the implementation](https://github.com/ifBars/blender-agent-studio/actions/runs/39713011647)
  passed, including the repository's Rust checks.

The pose tests cover known perspective and orthographic cameras, held-out
regression without changing the training solve, bounds, degeneracy, source
preservation and CLI validation. Fifteen reviewer tests cover report contracts,
measurement derivation, missing evidence and regression reporting.

## Real-input calibration exercise

Codex independently ran the shipped pose fitter against nine Jonesy body
landmarks with six separate held-out points. Training RMS changed from 27.454
to 24.776 pixels; held-out RMS changed from 28.578 to 25.034 pixels. The solver
reported `bound_limited`. This demonstrates real-input execution, not accepted
calibration or improved geometry. The source file was preserved.

The modeling workers also used campaign-specific multiview solvers. Their
custom reports must not be presented as output from the shipped comparison
reviewer. Camera fitting can absorb pose or shape error, so a lower residual
alone does not validate a model revision.

## Review findings carried into the workflow

The trials exposed an evaluation transform that blended the skull laterally
while moving eyes, brows and hair rigidly, and a face evaluator that reused
supposedly held-out features in shape fitting. Both undermine a before/after
claim. The workflow now requires a rigid skull with blending limited to the
neck, frozen evaluation pose and camera, and separate pose-fit, shape-fit and
validation membership.

Camera alternatives with similar body residuals produced materially different
nose and jaw projections. Facial reference annotation noise was also comparable
to the proposed two-percent tolerance. The workflow retains these uncertainties
instead of converting every overlay discrepancy into a geometry edit.

Luna's visible-skin mask exposed another confound: missing fringe coverage
looks like excessive face width. Hair occlusion, silhouette and anatomical
width need separate review before narrowing the skull. Both characters require
native and freshly imported head views as well as calibrated overlays.

## Selected model checkpoint

The selected revisions are Jonesy `p2_iter16` and Luna `p12s` (the p12 geometry
with a corrected landmark extraction). The ledger keeps
rejected and superseded passes. Jonesy changes include head/jaw proportions,
nose shape, eye spacing, ear height, actual lid/lash placement, skin-conforming
brows and broader hair sections. Luna changes include eye and lip contours,
nose and jaw adjustments, fringe coverage and bob shape. Fixed native close-ups
and fresh GLB views were opened independently by Codex.

Codex also freshly imported the selected exports through the asset inspector:

| Character | Triangles | Mesh objects | Materials | Images |
| --- | ---: | ---: | ---: | ---: |
| Jonesy | 119,094 | 30 | 34 | 7 |
| Luna Snow | 397,828 | 74 | 23 | 1 |

Both report zero invalid vertices, degenerate faces, zero-length edges and
missing material faces. Both are static, without armatures or actions. Open
boundaries and separate surfaces remain; this is not a watertight or rigging
validation. The inspected GLB hashes are
`5f9bed1a2cb8fb0de12448efc66811e1ac32c7e90984a8a4bda260bf612e11a5`
and `e4d9d593cfe729514d9dbb339db3d54dfc3f937cc775e9a1fd780f81cabbc96a`.

The 95-percent overlap and face-proportion goals are **not met**. Jonesy's
relative view elevation and head pose remain uncertain, and his face planes,
lip placement and hairline still differ. Luna's fringe coverage improves the
mask but her hair still reads as a layered shell and facial identity is incomplete.
Body/outfit geometry was held fixed during these head passes. Changes in a
full-body mask from head edits are not body-proportion improvements.

Local sources, calibration inputs, revisions and images are retained outside
Git under campaign ID `pr31-likeness-refinement-20261021`. The earlier
`pr31-likeness-multiview-20261021` campaign remains separate. These authored
trials do not establish consistent 95-percent likeness or a controlled skill
effect.
