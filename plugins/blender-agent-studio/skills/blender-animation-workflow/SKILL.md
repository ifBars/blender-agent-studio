---
name: blender-animation-workflow
description: Author, diagnose, and refine Blender animation for humanoid locomotion, grounded turns, interaction IK, first-person hands, articulated props, mechanical assemblies, and game-ready actions. Use when motion timing, contacts, pivots, critical poses, trajectories, visibility states, or exported actions must be created or reviewed.
---

# Blender Animation Workflow

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Make the mechanism understandable in still critical frames before polishing curves.

## Humanoid motion and interaction

For characters, read [humanoid motion and contact IK](references/humanoid-motion.md)
and use its [review record](references/motion-review-template.md). Establish
weight transfer, support phases and target-relative gestures before adding IK.
Preserve the motion intent when repairing stiffness; neither repeated foot
lifts nor an idle body swivel establishes a natural turn. Check full-speed
motion separately from contact accuracy, then compare native and fresh-import
evidence. Engine and remote-observer checks apply when integration is requested.

## Find humanoid motion with Mixamo

For Mixamo search, preview, download and import, follow
[the Mixamo workflow](references/mixamo.md). Use `blender_prepare_mixamo_search`
to prepare the browser handoff, then `blender_import_mixamo_animation` to turn
the downloaded FBX into a standalone animated `.blend`. Live catalog access
requires host browser tools; applying motion to another rig requires a separate
compatibility or retargeting workflow.

## Define semantic phases

1. Name the start, anticipation, contact, transfer, release, landing, rebound, and settle frames that apply.
2. Specify which assemblies move and which stay fixed.
3. Identify guides, pivots, contact surfaces, and material-state transitions.
4. For mechanical assemblies, read [references/mechanical-animation.md](references/mechanical-animation.md) for the review contract. For humanoids, use the contact and interaction contract above.

## Author motion

- Place pivots on actual hinge or rotation axes.
- Parent rigidly moving parts to one assembly.
- Use linear interpolation for mechanically constant motion and clamped Bezier handles for eased human-visible motion.
- Key location and rotation together when an ejected or falling object changes orientation.
- Keep moving components constrained by visible rails, sleeves, hinges, or guides.
- Compute rigid moving attachments from a local anchor transformed by the owning
  assembly's evaluated `matrix_world`. For skinned clothing and accessories,
  follow the evaluated deforming surface with appropriate weights or surface
  binding; an object transform alone cannot track skin deformation.
  Never rotate a world-space point around
  the origin as a substitute for a hinge transform.
- Rebuild or key dynamic connectors such as cables, hoses, pistons, and link
  rods from their two evaluated endpoints at every required critical frame.
- Assert connector endpoint error numerically before rendering. A connector is
  not valid merely because its object has keyframes.
- Animate separate material states when transfer must be legible.
- Avoid unexplained teleporting visibility changes in mechanisms. Explicitly
  requested gameplay snaps, such as instant seat entry/exit, follow the
  humanoid guide's seat-anchor and recovery checks.

## Validate

1. Run `$blender-agent-studio:blender-asset-validation` on the source and, when required by the task, the requested export.
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
   - exported action frame range when animation export is required.
6. For every dynamic connector, report the maximum endpoint residual at the
   critical frames and inspect both endpoints in the rendered frames.

Do not accept an animation solely because keyframes and actions survived export.

For character socks, cuffs, ankles and flexible straps, use the character
workflow's surface-attachment loop and `blender_inspect_attachments` where
available. Check neutral, contact, passing and lifted-foot poses from side
and rear, repair the failed binding, then rerun the same sampled frames and
closeups. Preserve deliberately stylized proportions and mitten hands.
