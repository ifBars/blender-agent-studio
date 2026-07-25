---
name: blender-modeling-workflow
description: Build or substantially refine reproducible Blender models through Python and the Blender CLI. Use for user requests to create meshes, props, hard-surface assets, stylized objects, assemblies, procedural geometry, game-ready GLB assets, or to iterate on a scripted Blender model from visual feedback.
---

# Blender Modeling Workflow

Create the asset as source-controlled Python plus generated `.blend` and `.glb` outputs. Treat the script as the durable source and Blender as the execution runtime.

## Establish the contract

1. Resolve the exact Blender executable and record `blender --version`.
2. Convert the request into a short modeling contract before editing:
   - required parts and visible relationships;
   - intended style and materials;
   - dimensions and triangle budget;
   - moving parts, pivots, or required contexts;
   - deliverables and evidence views.
3. Keep subjective goals as explicit review questions. Do not silently turn them into arbitrary geometry thresholds.
4. Read [references/modeling-contract.md](references/modeling-contract.md) for the contract shape.

## Author for iteration

1. Create one deterministic entry script. Set seeds explicitly when randomness is used.
2. Start from a clean scene and name semantic parts, assemblies, materials, actions, cameras, and anchors.
3. Model readable primary forms before small surface detail.
4. Give every visibly moving or functional part a plausible connection, support, guide, hinge, sleeve, rail, or parent.
5. Keep important dimensions and animation frames as named constants near the top of the script.
6. Preserve editable construction where useful, but evaluate modifiers before measuring exported geometry.
7. Read [references/procedural-patterns.md](references/procedural-patterns.md) when implementing reusable Blender helpers.

## Execute and inspect

Run Blender headlessly:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
& $env:BLENDER_EXECUTABLE `
  --background --factory-startup --python .\create_asset.py
```

If `blender` is already on `PATH`, use it directly. The bundled MCP and
benchmark runner also accept an explicit `blenderPath` or `--blender` value.

After every material geometry change:

1. Generate the `.blend` and `.glb`.
2. Use `$blender-agent-studio:blender-asset-validation` to inspect evaluated geometry and render standardized evidence.
3. Open the hero render and contact sheet with an image-viewing tool.
4. Inspect silhouette, proportion, supports, intersections, readability, orientation, materials, and requested details.
5. Refine the source script and regenerate. Do not patch generated outputs manually.

For animated or articulated assets, also use `$blender-agent-studio:blender-animation-workflow`.

## Completion gate

Do not call the model complete until:

- the source script reruns from a clean Blender process;
- generated artifacts open after fresh GLB import;
- technical gates appropriate to the task pass;
- required parts and spatial relationships are visible from the evidence views;
- no major component reads as floating, accidental, or mechanically unexplained;
- the final response includes the source, `.blend`, `.glb`, metrics, and rendered evidence paths.
