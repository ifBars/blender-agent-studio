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

## Render evidence

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
