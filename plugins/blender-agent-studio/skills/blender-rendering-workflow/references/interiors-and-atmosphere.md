# Interiors and atmospheric lighting

Use this guidance when a render depends on architecture, fabrics, daylight or
volumes. A standardized studio is useful for isolated geometry inspection; it
cannot validate an authored interior's lighting or materials.

## Build a physical light path

- Define room dimensions, wall thickness, real window apertures, camera position
  and the direction sunlight travels before furnishing the room. Trace the
  intended ray from an opening to its receiving surface. Keep a closed ceiling
  and off-camera walls when they affect light transport.
- Establish a readable image without haze first. Balance exterior daylight,
  interior bounce and practical lights. Avoid brightening every light to solve
  a local exposure problem.
- Use actual scattering inside a bounded volume for sunlight shafts. Do not
  substitute luminous cones, painted planes or bloom for light transport.
  Window mullions, curtains and partially open shutters can break up an overly
  broad aperture. Validate the shadows as well as the visible light.
- Density is coupled to path length: comparable optical depth needs density
  inversely proportional to the scene's scale. Start with thin atmosphere and
  inspect its effect across the whole room. More density often produces fog
  and lost contrast instead of clearer shafts.
- Avoid coincident volume boundaries and architectural surfaces. Ensure the
  camera and intended scattering region are inside the medium. Render a crop
  at higher samples before deciding whether mottling is material detail or
  volumetric sampling noise.
- Keep world illumination, sun angle, volume density and exposure explicit.
  Compare controlled variants from the same camera; do not change them all
  without recording which hypothesis each variant tests.

## Make materials and soft forms convincing

- Keep texture scale in physical units where possible. A plaster bump distance
  that looks harmless on a sample sphere can look like damaged concrete across
  a room. Inspect a detail camera as well as the hero.
- Distinguish woven microstructure from geometric folds. Broad periodic sine
  waves rarely make believable bedding. Use cloth simulation or localized
  tension, compression, drape, gravity, seams and asymmetric folds that follow
  supports. Check mattress/duvet contact and collisions explicitly.
- Preserve an accepted drape as a comparison checkpoint. A more elaborate cloth
  solver is not automatically an improvement: reject excessive crumpling,
  intersections and lost silhouette. If the user prefers an earlier version,
  restore its geometry and material in the reproducible source, then verify the
  rebuilt render while retaining independent improvements.
- Give lampshades actual thickness/openings and appropriate transmission;
  solid capped cones can block their own practical light. Give glass a deliberate
  transport strategy and test whether it blocks the intended daylight.
- Read material relationships in the final engine: matte fabric, ceramic,
  wood, glass and metal must remain visibly distinct after lighting/denoising.

## Evidence and delivery

Use `blender_render_scene` with `inspectOnly: true` to discover cameras and
dependencies, then render named hero and detail cameras. The tool preserves
authored lighting, world, materials, atmosphere, color management and artistic
compositing. It caps resolution and Cycles samples, records the effective
device/settings, and mutes compositor File Output nodes to keep output within
the requested run. It never saves changes into the source file.

Open the returned image. A valid PNG and successful render process do not prove
photorealism. Record concrete visible defects and uncertainty; keep technical
validity separate from composition, realism and instruction compliance.

For a render-only project, the reproducible source, self-contained `.blend`,
render manifest and final images are primary deliverables. Export GLB only when
the downstream task needs it. Procedural materials, volumes, compositor effects
and Cycles lighting generally need baking or another representation for a
real-time handoff; a successful export alone does not preserve the beauty render.
