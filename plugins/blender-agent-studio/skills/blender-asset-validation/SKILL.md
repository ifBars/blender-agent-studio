---
name: blender-asset-validation
description: Inspect and validate Blender assets technically and visually. Use for `.blend`, `.glb`, `.gltf`, `.fbx`, or `.obj` quality checks; topology and export review; evaluated triangle/material/hierarchy metrics; standardized multiview renders; fresh-import verification; or evidence-backed review of an agent-generated mesh.
---

# Blender Asset Validation

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Validate both the authored scene and the exported deliverable. A clean export or low triangle count is not proof of visual or functional quality.

## Run deterministic inspection

Prefer the `blender_inspect_asset` MCP tool when available. Otherwise run:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
& $env:BLENDER_EXECUTABLE `
  --background --factory-startup `
  --python "<skill-root>\scripts\inspect_asset.py" -- `
  --input "<asset-path>" --output "<output-dir>\metrics.json"
```

Inspect:

- evaluated vertices, edges, polygons, and triangles;
- authored versus evaluated geometry density and refinement modifiers;
- smooth versus flat-shaded polygon ratios;
- UV-bearing meshes, node-based materials, image textures, and authored lights;
- mesh objects, materials, actions, frame ranges, and hierarchy;
- dimensions and world bounds;
- invalid coordinates, degenerate faces, loose elements, boundary and non-manifold edges;
- connected components per mesh;
- non-default transforms and missing material assignments.

Interpret metrics using [references/quality-gates.md](references/quality-gates.md). Do not apply printing-only topology rules to every game asset.

When inspection finds degenerate faces or zero-length edges, call
`blender_diagnose_topology` with `assetPath`, a new `outputJson`, and optionally
`objectName` and `limit`. It reports full counts and bounded world-space locations.
Indices belong to evaluated geometry: locate the region, repair durable source,
and reinspect the export. Open boundaries alone are not defects.

## Understand the scene before diagnosing a repair

When the Rust runtime is configured, use `blender_describe_scene` for evaluated
world bounds, authored `bas_role` labels, parenting and paginated object summaries.
Focus with an exact `objectId` and `includeDescendants`; follow `next_offset` for
large selections. An assembly follows object parenting, not collection names.

Use `blender_quality_report` with only brief-derived `triangleBudget`,
`requireClosedMesh`, or named `groundObjects` and an explicit `groundZ`.
Distances are in Blender world units. Constraints cover the full selection;
spatial candidates only compare the returned page. AABB overlap and proximity
are review candidates, not proven mesh intersections, contact or support.
Read extraction limitations, especially unexpanded instances and non-mesh forms.

The report never clears visual review: `review_required` is not a pass. Open the
fixed views below and answer its primary-form, reference and finish questions.
If the runtime is missing, follow its setup message or continue with the existing
inspector and visual evidence; do not claim unmeasured analysis.

After a repair, use `blender_compare_scenes` on the preserved candidate and
regenerated result. Declare `requiredObjects` and only the invariants supplied by
the contract. Use `invariantObjects` to exclude the intentionally edited part
from movement, dimension, hierarchy, role or topology-preservation gates. Review
all factual changes even when no declared invariant fails. An empty regression
list does not establish visual improvement; render both versions through the
same cameras and settings before retaining the repair.

For intended physical joints, declare `contactPairs` in the quality report as
exact mesh-object pairs that should touch. Choose them from the construction
contract, not from arbitrary nearby names. A positive bounds gap beyond
`tolerance` proves separation and produces `expected_contact_gap`, even when
the objects are outside the returned page. `contact_unverified` means the boxes
are close or overlap; it does not establish surface contact. For joints with an
intermediate connector, check each actual connection rather than requiring the
two remote endpoints to touch. Review the joint in multiple views, repair the
durable source, and rerun the same declared pairs before retaining the repair.

## Check specific connection points

Supply `frame` to SceneIR description, quality and comparison tools when checking
an animated pose. Use the same explicit frame for before/after evidence; paired
asset comparison rejects differing saved frames and unit scales. Repeat the
contract's checks at each required motion state. Setting a frame does not bake
a simulation or prove behavior between samples.

For cable terminals, hinge pivots or pipe ends, `contactPairs` can miss a wrong
endpoint when whole-object boxes overlap. Add `connectionPoints` to
`blender_quality_report` using a stable name, exact `objectA`/`objectB`,
object-local `pointA`/`pointB` XYZ, and `maxDistance` in world units. Empties
placed from the same source parameters as the real endpoints work as anchors.
Both objects must belong to the selected assembly; pagination does not hide checks.

`connection_checks` returns world positions, distance, and
`delta_world_b_minus_a`. A `connection_point_gap` identifies a misplaced declared
anchor even with overlapping boxes. Apply the correction to durable geometry
source; when editing local coordinates, transform the world delta into that
object's local space. Keep anchors derived from the geometry and verify the
rendered joint; moving markers alone is not a repair. `within_tolerance` proves
only anchor agreement, not mesh contact, watertightness or mechanical validity.

## Inspect evaluated motion

Use `blender_inspect_motion` with `assetPath`, a new `outputJson`, 2-12 distinct
increasing `frames`, and 1-8 exact mesh `objectNames`. It reports local evaluated
geometry hashes, world transforms and native modifier/bake metadata. It needs
Blender, not Rust, and never bakes or saves the source. Inspect an existing cache
for fluid/cloth and repeat on the exported file when animation export is required.

A changing local hash can establish sampled deformation rather than mere root
movement; it does not establish good deformation. Empty or unchanged samples,
missing cache files and unbaked modifiers need investigation. Bake flags do not
prove complete cache coverage. Use the domain workflow for contacts, collisions,
timing, appearance and continuous playback. CLI fallback: run
`scripts/inspect_motion.py` through Blender with `--input`, `--output`,
`--frames 1,12,24` and `--targets Body`.

## Render evidence

For reference-driven proportion checks, use `blender_compare_reference` with
an authored camera matching the reference. It returns a reference/silhouette/
overlay board inline. Keep camera, crop and pose fixed across geometry edits.
Only a supplied white-foreground, black-background `maskPath` enables silhouette
IoU and missing/excess coverage; ordinary photos receive visual overlays without
numeric similarity. This complements final multiview and material inspection.

If orientation is already plausible but framing differs, use
`blender_fit_reference_camera` with 3-32 spatially separated known landmarks,
`referenceWidth`/`referenceHeight`, and a new `outputDir`. Each landmark has
`name`, `objectName`, `localPoint` (XYZ), and `referenceUv` (XY normalized from
the image top-left). It fits scale/focal length and lens shift in a candidate
.blend without changing pose or meshes. Review that candidate using
`blender_compare_reference`; copy accepted parameters into durable source,
then freeze the camera for geometry comparisons. Lower landmark error measures
framing fit, not improved geometry. Large residuals may mean incorrect pose or
correspondences; do not distort the mesh simply to reduce them.

During a targeted repair, use `views: ["perspective", "front"]` (or two useful
fixed angles) and `resolution: 256` for quick feedback. The CLI accepts
`--views perspective,front`. The manifest labels this `partial_preview`;
it does not satisfy the final six-view gate. Preserve the same view selection,
resolution and explicit presentation for before/after inspection. Render the
full set once the repair is retained, rather than at every small edit.

The default `presentation: "auto"` selects a studio background using a
constant-material luminance hint: dark for bright assets, light for very dark
assets, neutral slate otherwise. The CLI equivalent is `--presentation auto`.
Use `neutral`, `dark`, or `light` to override. Light power and camera framing
scale with asset dimensions; the tool resets authored lighting and grading.
Keep a separate authored beauty render when the original lighting is part of
the requested result.

Open the first hero image before accepting the presentation. If material color
is washed out, shadows hide the form, or the silhouette merges into the backdrop,
rerender with a better preset. Automatic selection is a starting point; it
cannot infer texture-driven color, transparent appearance, or art direction.
Offer two useful options when they serve different goals, such as dark studio
and light catalog. Do not generate all presets routinely. Present a polished
hero image first, with multiview evidence available for inspection.

For benchmarks and before/after repairs, pin the same explicit preset and
renderer version across compared assets; do not adapt each condition separately.
`evidence.json` records the requested/resolved preset, power, framing, color
management, engine, and settings version. Version 2 changes lighting and framing;
older evidence must be rerendered before a controlled visual comparison.

Prefer `blender_render_evidence`. Otherwise run `scripts/render_evidence.py` with an output directory. Require:

- perspective hero view;
- front, back, left, right, and top views;
- one contact sheet;
- requested animation critical frames when applicable.

Open the hero and contact sheet with an image-viewing tool. Review:

- silhouette and proportions;
- required parts and spatial relations;
- orientation;
- floating or unsupported elements;
- intersections and accidental gaps;
- material readability;
- visible faceting, razor edges, blockout residue, and missing or broken
  textures;
- whether details remain legible at intended scale.

For humanoids, apply the character workflow's form/fit review: full-body
proportions plus close-ups of footwear, waist/crotch, shoulders, hands/thumbs,
and face/nose/ears/neck. Inspect evaluated skin surfaces in motion; connected
bones or a single mesh object do not prove continuous garments. Check skin tone
and texture seams under neutral lighting as well as the target presentation.
Treat blocky or oversized forms, unexplained overlaps and skin-tone discontinuity
as visual defects when inconsistent with the brief, not as successful low-poly
optimization. Use reference-relative judgments rather than universal ratios.

## Verify the exported artifact

1. Export GLB from the authored `.blend`.
2. Start a fresh Blender process.
3. Inspect and render the GLB independently.
4. Compare required names, materials, dimensions, actions, and critical frames with the authored scene.
5. Report authored and re-imported metrics separately.

## Report

Classify each finding as:

- `gate`: invalid or unusable deliverable;
- `defect`: clear request, geometry, presentation, or motion failure;
- `warning`: likely risk requiring review;
- `observation`: neutral measurement;
- `not_applicable`: check intentionally excluded by task semantics.

Include exact evidence paths. Never say an image or video was inspected unless it was actually opened.
