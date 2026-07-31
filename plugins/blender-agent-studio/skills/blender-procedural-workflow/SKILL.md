---
name: blender-procedural-workflow
description: Create reproducible Blender Geometry Nodes, modifiers, instancing systems, and procedural environments. Use when a request involves Geometry Nodes, scattering, terrain, architecture, repeated assets, parametric generators, non-destructive variation, or scalable scene assembly.
---

# Blender Procedural Workflow

Build an editable generator with an explicit parameter contract, not a one-off
node graph that only works for its current input.

## Define the generator contract

Identify inputs, units, random seed, variation controls, source assets,
performance budget, expected output geometry, and what the user may safely
change. State invariants such as non-overlap, terrain conformity, cardinal
orientation, density limits, stable IDs, or export realization.

Name node groups, sockets, modifiers, collections, materials, and instances
semantically. Keep input assets separate from generated output and do not hide
critical behavior in unnamed internal values.

## Author in layers

1. Start with a minimal graph proving the major transformation or placement
   rule. Test its output from multiple views before adding variation.
2. Expose only meaningful controls at the group interface, with units, ranges,
   defaults, and clear names. Keep dependent constants in the durable Python
   source where agents can regenerate them.
3. Use deterministic seed handling. When instances must remain stable across
   revisions, derive randomness from stable element IDs rather than evaluation
   order.
4. Prefer instancing for repeated assets; realize instances only for operations
   or exports that require real geometry. Measure evaluated triangle counts and
   memory implications after realization.
5. For terrain/scatter systems, validate slope, normal alignment, collision or
   exclusion zones, density falloff, scale range, clipping, and silhouette.
6. For modifiers and node graphs that feed animation or simulation, define the
   evaluation order and cache/bake boundary explicitly.

## Test the parameter surface

Render and inspect the default, minimum, maximum, and at least one seeded
variation. Test empty/small and dense/large inputs where meaningful. A graph
that looks good at a single seed or density is not reusable.

Use `$blender-agent-studio:blender-asset-validation` to inspect evaluated
output, transforms, materials, and exported geometry. For final art-directed
images, use `$blender-agent-studio:blender-rendering-workflow`.

## Completion gate

Deliver the source script, `.blend`, parameter list, seed, input-asset
requirements, and evidence for the tested configurations. State whether the
export retains the procedural graph or is intentionally realized/baked, since
GLB and other runtime formats do not preserve Geometry Nodes behavior.
