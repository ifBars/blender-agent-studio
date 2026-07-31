# Staged quality workflow

Use these stages for finished asset work. A stage is complete only when its exit
criteria are visible in evidence or measurable in the scene.

## 1. Contract and references

- Record required parts, spatial relationships, style, scale, finish profile,
  performance target, deliverables, and review views.
- Record whether low-poly is explicitly requested.
- Identify the intended view distance and the hardest silhouette or contact
  relationship to judge.

Exit when the modeling contract and review questions are explicit.

## 2. Graybox and proportion

- Build only major masses, room volumes, clearances, pivots, and contact planes.
- Use neutral materials and labels where they improve spatial review.
- Check scale, silhouette, negative space, access, and the relationship between
  every required major part.

Exit when proportions and layout work from front, side, top, and perspective
views. A graybox is not a finished asset.

## 3. Primary and secondary forms

- Replace proxy primitives with intentional shapes.
- Add real supports, attachments, openings, handles, panels, seams, and
  transitions that explain construction.
- Establish the visual hierarchy before small decoration.

Exit when the asset is identifiable from silhouette and no functional part
looks attached by coincidence.

## 4. Structural refinement and production topology

- Resolve intersections, floating parts, wall penetration, z-fighting, thin
  unsupported spans, pivots, normals, and deformation or export risks.
- Add bevels, support loops, subdivision, weighted normals, curve resolution,
  or manual topology appropriate to the finish profile.
- Preserve intentional low-poly faceting only when requested.

Exit when the evaluated geometry is clean, all contact relationships are
believable, and broad curves do not look accidentally faceted.

## 5. UVs, materials, and textures

- Give visible meshes intentional UVs or procedural coordinates.
- Build materials that describe distinct substances through color, roughness,
  metallic, transmission, normal, and restrained surface variation.
- Verify texture paths and render-engine compatibility.

Exit when no surface reads as default gray, accidental black, missing-magenta,
or indistinguishable from a different requested substance.

## 6. Tertiary detail and presentation polish

- Add only detail that reinforces scale, use, construction, wear, or style.
- Inspect the closest required view for faceting, razor edges, blockout residue,
  arbitrary decoration, noisy detail, and weak focal hierarchy.
- Balance lighting and exposure; do not use lighting to hide geometry defects.

Exit when the asset reads as intentionally finished from every required view,
not merely acceptable from the hero camera.

## 7. Export and fresh-import validation

- Save the authored `.blend`, export the requested runtime format, and import it
  in a fresh Blender process.
- Compare names, hierarchy, dimensions, materials, UVs, shading, animation, and
  critical frames.
- Render the final multiview evidence from the exported artifact when practical.

Exit when the durable source reproduces the deliverables and both authored and
fresh-imported assets pass the applicable gates.

## Approval behavior

When the user requests approval-gated work, stop at the agreed stage boundary,
show multiple useful angles, state what is intentionally unfinished, and wait.
Do not advance because the current stage is technically valid. When no approval
gate was requested, keep the same stages but self-review and continue.
