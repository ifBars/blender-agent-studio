---
name: blender-character-workflow
description: Create, repair, rig, skin, animate, and export Blender characters, creatures, avatars, and facial rigs with deformation and runtime validation. Use when a request involves a character mesh, armature, weights, IK/FK, blend shapes, facial animation, humanoid/VRM/game export, or deformation quality.
---

# Blender Character Workflow

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Match completion to the requested character: a static sculpt needs form and
surface evidence; a rigged or animated character also needs deformation
evidence. A mesh plus an armature is not a finished rig. Clarify static versus
rigged delivery if the request and context leave that consequential choice open.

## Establish the character contract

Record intended platform and export format, body/face scope, scale and axis,
triangle/material/texture budgets, bone naming and hierarchy requirements,
required controls, facial shape keys, poses/actions, and engine/avatar
constraints. Record the intended body type and a coherent proportion reference
set. Male and female variants need separately reviewed body proportions when
requested; a head or clothing swap does not validate another body type.
For a requested rig, identify the minimum acceptance poses: neutral, extreme bend for
each major joint, reach, twist, locomotion/contact, and any required facial
expression.

## Review character form and fit

Read [character form and fit review](references/character-form-review.md) for
humanoid creation and substantial anatomy/clothing repairs. Establish torso,
pelvis, boot and hand proportions against the references before adding detail.
Inspect continuous garment/joint surfaces, fitted accessories and skin-texture
consistency in neutral and moving poses. These are visual acceptance criteria;
passing rig/export metrics alone does not satisfy them.

For realistic, likeness or reference-based briefs, keep the guide's
brief-defining feature table. Each row needs an acceptance basis (an opened
reference, the brief or an approved design, or `unreferenced`), a matched model
view, the concrete differences and a verdict. A failed download is not a
reference. Reopen the reference when you review the
feature, and check face construction, hair volume, the named footwear type and
native/export pattern parity at delivery scale.

For a requested likeness refinement, follow [calibrated proportions and facial
likeness](references/likeness-refinement.md). Freeze camera/pose alignment before
shape edits, preserve body and tightly framed face snapshots, and check
independent views. Keep numerical projection targets separate from identity.

For game characters, resolve silhouette, face identity and fitted garment
surfaces before accessory detail. Inspect hands, boots, back and profile at
the intended gameplay distance; adding seams to box-like anatomy does not
finish it. For a rigged brief, test bend, reach and twist while forms are still
editable, then repeat affected poses after clothing/accessory changes. Reserve
time for this review and fresh-export deformation rather than spending the
whole budget on a neutral hero pose. Static briefs need no invented rig.

## Build and rig deliberately

Read [connected character construction](references/character-construction.md)
before creating humanoid hands, footwear or joint surfaces. It describes
palm-to-digit construction, footprint/profile shoe lofting, continuous
shoulder/pelvis transitions and localized weight bands. Use these construction
methods alongside the form review; naming the right parts is not enough.

For a procedural stylized humanoid, the optional Blender-Python starting cages
in `scripts/build_upper_body.py` and `scripts/build_hand.py` implement these
shared boundaries directly. Use them when appropriate instead of rebuilding
shoulders from capped tubes or fingers from intersecting primitives. Read
[the helper contract](references/character-construction.md#editable-starting-cages)
before importing them. Adapt proportions and inspect the actual result; they
are blockouts, not finished anatomy, clothing, or rigs.

Build a complete simple character before finishing regions. Preserve shared
boundaries and whole-body landmarks during local refinement. Review hand
palm/dorsal/edge views and shoe top/profile views before adding small details.
For rigged work, test the simple joint surfaces in bend and reach before
clothing detail, then verify the same poses after export. Keep an accepted
source checkpoint so a local improvement cannot silently damage the whole.

Preserve requested cartoon proportions and simplified hands. For animated
outfits, use the construction guide's rigid/flexible attachment rules: socks
and cuffs must follow the local leg surface, soles the feet, and straps their
actual supports. Check ankle flexion, foot lift and passing poses from side
and rear before replicating an outfit across a character family.

For static character requests, build and review the form without inventing a
rigging requirement. The rigging and motion steps below apply when requested.

Retrieve anatomy references with compatible species, age and pose before building
a new character or creature. For a low-poly brown bear, for example, look for
whole-body front, profile and three-quarter views in a comparable stance, plus
head and paw close-ups. Record body/head proportions, muzzle depth, shoulder
shape and foot contact from those images. Use separate low-poly examples for
plane simplification; do not replace anatomy with a generic animal silhouette
or infer all four legs from one occluded photograph.

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

For locomotion, grounded turns, sitting, carrying and first-person interaction,
follow the animation workflow's [humanoid motion guide](../blender-animation-workflow/references/humanoid-motion.md).
Declare root-motion ownership, support/grip anchors and reach limits. Separate
base motion quality from IK accuracy, inspect weight transfer and transitions
at normal speed, and verify grip orientation as well as hand position. Use the
real seat, prop and gameplay camera when they are part of the brief. Native
constraint success does not establish baked-export or runtime IK behavior.

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

Close the loop on each failed region: preserve the current asset and evidence,
name the defect, change its construction or binding, regenerate, and reopen
the same views and poses. Do not compensate for weak joints with unrequested
pads, or hide poor forms with textures. Recheck neighboring surfaces after
a regional repair. Stop only when the required checks and visual review agree,
or explicitly deliver the remaining defect and evidence as incomplete.

For skinned attachments, use `blender_inspect_attachments` when available.
Bind small, explicit vertex patches on both sides of a seam before posing:
sock/shin, cuff/leg, shoe/ankle, strap/support. Use multiple pairs around the
boundary; a single centroid can miss rotation. Fix the frame set and permitted
gap from the brief/scale before testing. Verify the intended active action/NLA
state in the saved inspection copy; the tool samples that state and does not
select animation clips. SceneIR object-local points alone
do not follow skin deformation. The surface inspector projects evaluated
patches into SceneIR and reports the worst frame and per-frame gap.
Record selectors in an inspection manifest once topology is stable. Inspection
groups are metadata, not additional deform weights; exclude them from bone
weight normalization and influence-count audits, or use explicit vertex indices.
Repair weights, ownership or geometry, then repeat with unchanged bindings
and thresholds. Pass the preserved output as `baselineJson` on the repair
run to detect newly failing frames and changed bindings. Topology changes
require rebinding and renewed visual review;
never move a marker or widen tolerance just to pass.

This tool requires stable topology and the Rust runtime. If unavailable or
unsupported, retain the same pose/close-up review and report the numeric check
as unverified. Repeat on the fresh export with explicitly verified export
selectors; indices and custom groups may not survive export. A within-tolerance
result still requires visual review of intersection, silhouette and deformation.

Resolve or explicitly report the form/fit review findings. Include full-body
and feature close-ups from the final revision, with affected poses rechecked
after the last geometry/material edit. Report the feature verdicts. Do not
claim a realistic or likeness result unless the face and every other
brief-defining feature is accepted.

Deliver the editable source, requested export and fresh-import evidence. For a
rigged/animated character, include the bone/control map and tested pose/action
list. State any target-specific validation that could not
be performed in Blender; a successful GLB import is not proof of runtime avatar
compatibility.
