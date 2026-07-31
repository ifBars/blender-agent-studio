# Procedural Blender patterns

## Scene setup

- Remove prior objects and unused generated data at the start of a standalone generator.
- Set units, render engine, color management, frame range, and output paths explicitly.
- Use stable semantic names. Avoid `Cube.017`-style output.
- Parent related parts to named empties without changing world transforms.

## Geometry

- Build primary dimensions from constants rather than scattered literals.
- Apply bevels proportionally to object scale.
- Unless low-poly is explicit, use enough radial segments for a smooth intended
  silhouette and judge them from the closest required evidence view.
- Use subdivision only where the control topology and silhouette benefit from
  it. Hard-surface parts may instead use bevels, weighted normals, or deliberate
  manual topology.
- Keep an editable refinement stack in the authored `.blend` when practical,
  then inspect the evaluated and exported result.
- Prefer separate objects for articulated parts and intentional material boundaries.
- Avoid coplanar duplicate faces and decorative geometry fully buried inside other solids.
- Generate simple collision proxies separately when a game asset needs them.

## Materials

- Use a small coherent palette.
- Set Principled BSDF inputs explicitly.
- Make roughness and metallic differences support material identity.
- Use UVs, procedural coordinates, or authored textures intentionally. A set of
  differently colored flat materials is not a complete texture pass when the
  requested substances need surface variation.
- Check for missing or magenta textures, crushed black materials, overexposure,
  and insufficient contrast in the actual render engine used for evidence.
- Avoid relying on one camera or lighting setup to hide weak geometry.

## Animation

- Put pivots at the actual mechanical axis.
- Animate parent assemblies when several child parts move rigidly together.
- Name semantic phase frames.
- Key visibility or material-transfer states deliberately; do not let material appear without a readable source.

## Export

- Save the source `.blend`.
- Export GLB with named objects, actions, materials, and transforms preserved.
- Re-import the GLB in a clean Blender process before reporting final counts.
