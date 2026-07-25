# Procedural Blender patterns

## Scene setup

- Remove prior objects and unused generated data at the start of a standalone generator.
- Set units, render engine, color management, frame range, and output paths explicitly.
- Use stable semantic names. Avoid `Cube.017`-style output.
- Parent related parts to named empties without changing world transforms.

## Geometry

- Build primary dimensions from constants rather than scattered literals.
- Apply bevels proportionally to object scale.
- Use enough radial segments for silhouette quality, not hidden density.
- Prefer separate objects for articulated parts and intentional material boundaries.
- Avoid coplanar duplicate faces and decorative geometry fully buried inside other solids.
- Generate simple collision proxies separately when a game asset needs them.

## Materials

- Use a small coherent palette.
- Set Principled BSDF inputs explicitly.
- Make roughness and metallic differences support material identity.
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
