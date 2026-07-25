---
name: blender-animation-workflow
description: Author, diagnose, and refine Blender animation for articulated props, mechanical assemblies, material-transfer sequences, and game-ready actions. Use when motion timing, pivots, physical connections, critical poses, trajectories, visibility states, or exported GLB actions must be created or reviewed.
---

# Blender Animation Workflow

Make the mechanism understandable in still critical frames before polishing curves.

## Define semantic phases

1. Name the start, anticipation, contact, transfer, release, landing, rebound, and settle frames that apply.
2. Specify which assemblies move and which stay fixed.
3. Identify guides, pivots, contact surfaces, and material-state transitions.
4. Read [references/mechanical-animation.md](references/mechanical-animation.md) for the review contract.

## Author motion

- Place pivots on actual hinge or rotation axes.
- Parent rigidly moving parts to one assembly.
- Use linear interpolation for mechanically constant motion and clamped Bezier handles for eased human-visible motion.
- Key location and rotation together when an ejected or falling object changes orientation.
- Keep moving components constrained by visible rails, sleeves, hinges, or guides.
- Compute every moving attachment from a local anchor transformed by the owning
  assembly's evaluated `matrix_world`. Never rotate a world-space point around
  the origin as a substitute for a hinge transform.
- Rebuild or key dynamic connectors such as cables, hoses, pistons, and link
  rods from their two evaluated endpoints at every required critical frame.
- Assert connector endpoint error numerically before rendering. A connector is
  not valid merely because its object has keyframes.
- Animate separate material states when transfer must be legible.
- Avoid teleporting visibility changes unless the mechanism visibly occludes the transition.

## Validate

1. Run `$blender-agent-studio:blender-asset-validation` on the source and exported GLB.
2. Render all semantic critical frames from at least two useful cameras.
3. Render the complete action to video when timing or causality matters.
4. Open the contact sheet and video.
5. Check:
   - continuity and plausible speed;
   - contact and penetration;
   - attachment to guides;
   - readable cause and effect;
   - believable weight, impact, rebound, and settling;
   - visibility/material continuity;
   - exported action frame range.
6. For every dynamic connector, report the maximum endpoint residual at the
   critical frames and inspect both endpoints in the rendered frames.

Do not accept an animation solely because keyframes and actions survived export.
