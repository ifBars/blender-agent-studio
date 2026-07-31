---
name: blender-asset-validation
description: Inspect and validate Blender assets technically and visually. Use for `.blend`, `.glb`, `.gltf`, `.fbx`, or `.obj` quality checks; topology and export review; evaluated triangle/material/hierarchy metrics; standardized multiview renders; fresh-import verification; or evidence-backed review of an agent-generated mesh.
---

# Blender Asset Validation

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
