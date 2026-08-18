---
name: blender-character-workflow
description: Create, repair, rig, skin, animate, and export Blender characters, creatures, avatars, and facial rigs with deformation and runtime validation. Use when a request involves a character mesh, armature, weights, IK/FK, blend shapes, facial animation, humanoid/VRM/game export, or deformation quality.
---

# Blender Character Workflow

Character completion requires deformation evidence. A mesh plus an armature is
not a finished rig.

## Establish the character contract

Record intended platform and export format, body/face scope, scale and axis,
triangle/material/texture budgets, bone naming and hierarchy requirements,
required controls, facial shape keys, poses/actions, and engine/avatar
constraints. Identify the minimum acceptance poses: neutral, extreme bend for
each major joint, reach, twist, locomotion/contact, and any required facial
expression.

## Build and rig deliberately

1. Keep the authored mesh, armature, controls, deformation helpers, and export
   mesh in named collections. Apply or deliberately preserve transforms before
   skinning; document the choice.
2. Create anatomically or mechanically plausible joint placement and semantic
   bone names. Separate deform bones from animator controls where the target
   benefits from it.
3. Keep symmetry and mirror workflows explicit. Limit vertex influences and
   normalize weights according to the target runtime requirements.
4. Add IK/FK, constraints, corrective shapes, or drivers only when they solve a
   named deformation need. Test without relying on a single flattering pose.
5. For facial work, name shape keys semantically and test combinations that
   reveal volume loss, collisions, or eyelid/mouth failures.

## Validate export and motion

1. Render the neutral and every contract pose from front, profile, back, and
   close-up deformation views. Open the evidence.
2. Check volume preservation, joint collapse, candy-wrapper twisting, clipping,
   foot/hand contact, constraint cycles, control readability, and unwanted
   scale/shear.
3. Export to the requested format, fresh-import it in a clean Blender process,
   and compare armature hierarchy, skin weights where supported, materials,
   actions, frame ranges, scale, and orientation.
4. Use `$blender-agent-studio:blender-animation-workflow` for action timing and
   `$blender-agent-studio:blender-asset-validation` for authored/exported
   geometry and hierarchy evidence.

## Fit modular VRChat hair

For arbitrary head and hair assets, use `scripts/fit_vrchat_hair.py`. It fits
the largest semantic hair mesh against the upper cranial region in evaluated
world space while applying one uniform transform to the complete hair rig.
Do not align the full hairstyle minimum Z to the head top; hanging strands and
ponytails make that measurement invalid.

Require a 1-8 mm median fitted clearance, no more than 15 mm p95 clearance,
fewer than 2% large gaps over 20 mm, and a 1.02-1.10 hair-to-cranium width
ratio. Preserve hair armatures, bones, weights, materials, UVs, and separately
named style meshes. Treat nearest-normal sign as a warning on multi-component
or open head meshes, not proof of penetration; confirm intersections in fixed
front, back, side, top, and perspective evidence. A Blender style visibility
setup is not proof that Unity/VRChat expression-menu toggles were authored.

## Completion gate

Deliver the editable source, export, bone/control map, tested pose/action list,
and fresh-import evidence. State any target-specific validation that could not
be performed in Blender; a successful GLB import is not proof of runtime avatar
compatibility.
