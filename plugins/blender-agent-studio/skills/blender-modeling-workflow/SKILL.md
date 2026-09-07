---
name: blender-modeling-workflow
description: Build or substantially refine reproducible Blender models through Python and the Blender CLI. Use for user requests to create meshes, props, hard-surface assets, stylized objects, assemblies, procedural geometry, game-ready GLB assets, or to iterate on a scripted Blender model from visual feedback.
---

# Blender Modeling Workflow

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Create the asset as source-controlled Python plus generated `.blend` and `.glb` outputs. Treat the script as the durable source and Blender as the execution runtime.

For a render-only scene, route final delivery through the rendering workflow:
source, self-contained `.blend`, images and render manifest are sufficient.
Require GLB and fresh-import gates when a downstream asset/export is part of the
contract. Do not imply that procedural shaders, atmospheric volumes or Cycles
lighting survive a GLB export unchanged.

## Establish the contract

1. Resolve the exact Blender executable and record `blender --version`.
2. Resolve routine visual and technical choices from context and state useful
   defaults. Use `$blender-agent-studio:blender-art-direction-intake` when an
   unresolved decision would cause substantial rework and context provides no
   reasonable default, or when the user explicitly requests a brief/concept.
3. Convert the request into a short modeling contract before editing:
   - required parts and visible relationships;
   - intended style and materials;
   - intended finish quality and whether low-poly is actually requested;
   - dimensions and an appropriate triangle range or performance target;
   - moving parts, pivots, or required contexts;
   - named stages, review evidence, and any user approval gates;
   - deliverables and evidence views.
4. Keep subjective goals as explicit review questions. Do not silently turn them into arbitrary geometry thresholds.
5. Read [references/modeling-contract.md](references/modeling-contract.md) for the contract shape.

## Default to a finished-quality asset

Treat “game-ready,” “stylized,” and “optimized” as quality constraints, not as
synonyms for visibly low-poly.

- Unless the user explicitly requests low-poly, blockout-only, voxel,
  faceted, PS1-era, or an unusually strict platform budget, target a polished
  smooth model with clean silhouettes, bevels or support geometry, appropriate
  subdivision or curve resolution, and readable secondary and tertiary forms.
- Use the lowest density that preserves the intended finish from every
  evidence view. Do not optimize away the shape language, material breaks, or
  contact detail that makes the asset feel complete.
- Preserve an explicitly requested low-poly style. Do not smooth or subdivide
  away intentional planar forms merely because the normal default is polished.
- A triangle ceiling is a limit, not a target. Do not celebrate being far under
  budget when the result still reads as a blockout.

## Work in named stages

Read [references/staged-quality-workflow.md](references/staged-quality-workflow.md)
and make the current stage explicit in progress updates and `final_report.md`.
For a normal finished asset, satisfy all stages' exit criteria. Adjacent stages
may share a build and review pass; a repair revisits only affected stages:

1. contract and references;
2. graybox and proportion;
3. primary and secondary forms;
4. structural refinement and production topology;
5. UVs, materials, and textures;
6. tertiary detail, smoothing, subdivision, and presentation polish;
7. export, fresh-import validation, and final evidence.

Do not add final materials to disguise unresolved proportions or unsupported
parts. Do not call a graybox or refined blockout “finished.” If the user asks
for approval-gated iteration, stop after the requested stage, show multiple
angles, and wait for approval. Otherwise, including interactive work, perform
self-review at each relevant milestone and continue without asking.

## Author for iteration

1. Create one deterministic entry script. Set seeds explicitly when randomness is used.
2. Start from a clean scene and name semantic parts, assemblies, materials, actions, cameras, and anchors.
3. Model readable primary forms before small surface detail.
   For multi-zone scenes, plan finish coverage for the whole contracted asset.
   Review secondary work areas and inspectable reverse/top surfaces before
   spending the remaining detail budget on the hero object. Authored-camera
   beauty renders supplement the promised multiview checks.
4. Give every visibly moving or functional part a plausible connection, support, guide, hinge, sleeve, rail, or parent.
5. Keep important dimensions and animation frames as named constants near the top of the script.
6. Preserve editable construction where useful, but evaluate modifiers before measuring exported geometry.
7. Use bevel, subdivision, weighted normals, smooth shading, curve resolution,
   or deliberate manual topology according to the requested style. Inspect the
   evaluated result rather than assuming a modifier equals polish.
8. Read [references/procedural-patterns.md](references/procedural-patterns.md) when implementing reusable Blender helpers.

## Execute and inspect

Run Blender headlessly:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
& $env:BLENDER_EXECUTABLE `
  --background --factory-startup --python .\create_asset.py
```

If `blender` is already on `PATH`, use it directly. The bundled MCP and
benchmark runner also accept an explicit `blenderPath` or `--blender` value.

After each coherent geometry change, regenerate the authored asset and inspect
the affected numerical invariants and low-cost views. At a quality milestone,
open multiview evidence and assess silhouette, proportion, supports,
intersections, readability, orientation, and requested details. Open individual
views at original detail when the contact sheet cannot resolve a defect.

Use `$blender-agent-studio:blender-asset-validation` for early fresh-import
checks when a change risks export behavior and for full final inspection and
standardized evidence. A cosmetic iteration does not require the entire export
pipeline unless it changes the exported appearance. Refine durable source and
regenerate; do not patch generated outputs manually.

For animated or articulated assets, also use `$blender-agent-studio:blender-animation-workflow`.

## Completion gate

Do not call the model complete until:

- the source script reruns from a clean Blender process;
- generated artifacts open after fresh GLB import;
- technical gates appropriate to the task pass;
- every required stage reached its exit criteria or was explicitly excluded by
  the user;
- the asset no longer reads as a blockout from any required view unless a
  blockout was the requested deliverable;
- curves and broad surfaces are smooth enough for the intended view distance,
  while explicitly low-poly forms retain their intentional faceting;
- materials describe the requested substances and visible UV, texture,
  shading, or lighting failures are resolved;
- required parts and spatial relationships are visible from the evidence views;
- no major component reads as floating, accidental, or mechanically unexplained;
- the final response includes the source, `.blend`, `.glb`, metrics, and rendered evidence paths.
