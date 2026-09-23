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
   competing interpretations change identity, style or deliverables and context
   does not resolve them, or when the user explicitly requests a brief/concept.
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

For new subjects, follow the shared guidance's reference-gathering step before
the graybox. Write down the proportions and relationships the references imply,
then compare matching graybox views against them. A folder of images without
observations or a comparison pass does not complete the reference stage.

For supplied images, create a named reference camera in the bpy source. Match
the [image-to-3D contract](references/image-to-3d.md) first, including which
features are binding and which hidden surfaces require inference. Then match
the image's projection, framing and pose before altering proportions. Use
`blender_compare_reference` at `maxEdge: 256` or 512 to see the reference,
projected model silhouette and overlay together. Fix the largest primary-form
or negative-space mismatch first, then regenerate into a new comparison output.
Keep camera and crop fixed while judging a geometry edit. Use complementary
angles to resolve depth rather than flattening a model to win one projection.

Supply `maskPath` only when a reviewed white-on-black subject silhouette exists
at the exact reference dimensions. Pink marks missing geometry coverage; cyan
marks excess. Without a mask, use the overlay visually and do not invent a
similarity score. Transparent surfaces are opaque in this geometry pass; inspect
materials separately. Exclude unrelated staging geometry from the reference
scene. A high silhouette IoU does not establish 3D shape or finish quality.

For identifiable reference features, supply up to 32 `landmarks` to the same
tool: a name, exact `objectName`, `referenceUv` normalized from image top-left,
and optional object-local `localPoint`. Use authored empties for stable feature
anchors. Yellow/blue markers and signed pixel offsets provide precise feedback
for Astra's visual diagnosis even without a mask. Check the camera first when
many landmarks shift together. With plausible pose and at least three separated
correspondences, `blender_fit_reference_camera` can fit framing in a candidate
scene; review its overlay, retain accepted parameters in source, then freeze
the camera. It does not solve orientation or position. Change local geometry when only a feature is
wrong. In-frame projection does not prove that a point is visible.

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

For characters, also use `$blender-agent-studio:blender-character-workflow`
and its form/fit review. Low-poly style is not an exception to plausible torso
and shoe proportions, connected garment surfaces, or fitted accessories. A
beveled box and detailed texture do not by themselves resolve a blocky form.

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

For a suspected detached joint, use construction-derived `contactPairs` in
`blender_quality_report` to confirm definite separation. Check the actual
connections through intermediate hardware. Close or overlapping bounds remain
`contact_unverified`; numerical checks never replace visual finish review.
Preserve useful declared constraints across subsequent geometry changes.

For a local repair, preserve the last good source and change the smallest area
that resolves the visible defect. Keep successful silhouette, proportions,
bevels, material separation and secondary detail. Do not simplify the whole
asset to clear a diagnostic. Request `views: ["perspective", "front"]` (or the
two angles that reveal the defect), `resolution: 256`, and a fixed presentation
for a fast before/after preview. Review whether the repair also lost edge
refinement, glass depth, material readability or construction detail. Retain it
only if the visible result improves; then run final evidence once.

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
