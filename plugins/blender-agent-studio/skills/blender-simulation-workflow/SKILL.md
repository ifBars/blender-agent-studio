---
name: blender-simulation-workflow
description: Create, diagnose, bake, and validate deterministic Blender physics simulations including fluid, smoke, fire, rigid bodies, cloth, soft bodies, particles, and hair. Use when a request involves physical dynamics, collision, cache baking, fluid or volume output, simulation handoff, or rendering a simulation.
---

# Blender Simulation Workflow

Simulation is a cache-producing build step. Preserve the setup and cache
provenance; a visually plausible single frame is not proof that it is stable.

## Define the simulation contract

Record the simulation type, solver, timeline, scale, gravity/forces, collision
objects, emitters, domain bounds, desired behavior, cache location, resolution
or substeps, and deliverable format. State the frames that establish onset,
peak interaction, and settle. For fluids, explicitly distinguish liquid from
gas/fire/smoke and whether a mesh, particles, or volume is the deliverable.

Use a project-local cache directory outside source control. Never overwrite an
existing approved bake without creating a new output location or explicit user
approval.

## Build a controlled setup

1. Apply or account for object scale; use real-world scene scale and record
   units. Mis-scaled colliders and domains invalidate tuning conclusions.
2. Name domain, flow/emitter, effector/collider, force, cache, and output
   objects semantically. Keep a collection for inputs separate from generated
   mesh, volume, particles, or bake artifacts.
3. Start with a short, coarse preview cache to prove the causal setup,
   collision direction, and timing. Do not begin a costly final bake before
   opening preview evidence.
4. For fluid/smoke/fire, bound the domain tightly enough to control cost while
   leaving required motion margin. Use Modular or Final cache intentionally;
   document the ordered bake stages when applicable.
5. For rigid, cloth, soft-body, particle, or hair work, establish collider
   thickness, substeps, damping/friction, self-collision, and pin/attachment
   constraints before aesthetic forces or turbulence.
6. Set seeds explicitly for stochastic effects. Preserve cache settings and
   simulator version alongside the generation script.

## Bake and validate

1. Bake the preview, then inspect the specified critical frames from at least
   two useful cameras.
2. Check that emitters and colliders affect the result at the intended time;
   that domains do not clip it; that collision does not tunnel, explode, or
   penetrate; and that mass, drag, settling, and scale read plausibly.
3. Change one causal parameter group at a time, invalidate the affected cache,
   and rebake the smallest frame interval that proves the change.
4. Bake final data only after the preview passes. Verify every expected cache
   stage/file is present and the timeline reads it rather than recomputing an
   implicit temporary state.
5. Render the requested critical frames and, when timing matters, an encoded
   preview or final sequence using `$blender-agent-studio:blender-rendering-workflow`.

## Completion gate

Deliver the reproducible setup script or `.blend`, cache manifest (type,
location, frames, resolution/substeps, seed, Blender version), final cache or
exported simulation artifact as requested, and visually inspected evidence.
Report the scope honestly: a short cache preview validates those frames only;
it does not validate the full final timeline. Use asset validation after
converting a simulation to a mesh or export format.
