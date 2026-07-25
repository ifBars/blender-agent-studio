# Quality gates

## Universal hard gates

- Blender process exits successfully within the timeout.
- At least one non-empty mesh exists.
- No non-finite vertex coordinates or object transforms exist.
- Required deliverables are written.
- GLB can be imported into a new Blender process.
- Required object, material, action, and anchor names survive export.

## Contextual geometry checks

Treat these as failures only when the asset contract requires them:

- watertight/manifold surface;
- exactly one connected component;
- no boundary edges;
- applied transforms;
- UV map presence;
- collision geometry;
- one material per object.

Multi-part machines, foliage cards, open cloth, hair, effects meshes, and articulated assemblies legitimately violate some printing-oriented checks.

## Strong warning signals

- zero-area faces or zero-length edges;
- unexpectedly tiny disconnected components;
- objects with extreme or negative scale;
- missing materials on visible polygons;
- a triangle count far outside the requested budget;
- origins far from their geometry;
- pivots unrelated to the visible joint;
- hidden internal detail dominating the triangle budget;
- authored and re-imported dimensions or action counts disagree.

## Visual review questions

- Can the object be identified from silhouette alone?
- Are primary, secondary, and tertiary forms proportionate?
- Do functional parts visibly connect?
- Are support and contact relationships believable?
- Does the material palette describe different substances?
- Does the asset remain readable in front, side, top, and perspective views?
- Does it look correct at the intended in-game or icon scale?
