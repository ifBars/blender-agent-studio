# Humanoid motion, contacts and interaction IK

Use this guide for locomotion, turns, sitting, reaching, carrying, first-person
hands and expressive gameplay actions. IK is a contact correction over a
coherent motion, not a substitute for timing, weight transfer or a readable
pose. A character can have almost zero measured foot drift and still turn
like a robot. Preserve intended stylization without accepting accidental
sliding, stiff swivels or repeated marching steps.

## Freeze the motion contract

Start with the actual rig, proportions, outfit, action and interaction geometry.
Record units, up/forward axes, rest pose, bone axes/roll, chain lengths, control
ownership and the root-motion convention. Name the active action and any NLA,
constraint or runtime layers. A clip name is not evidence of its visible pose.

For each action, record:

- intent and observer: first-person owner, another player, cinematic or NPC;
- frame range, frame rate, contact phases, interruption and recovery states;
- root/controller movement and which system owns each driven transform;
- support and grip anchors, their coordinate spaces, tolerances and reach limits;
- permitted snaps, heel pivots, toe-off, sliding or stylized exaggeration;
- required source, baked export and engine evidence, with unavailable stages
  explicitly marked unverified.

Use [the motion review template](motion-review-template.md) beside the working
asset. Fix comparison cameras, clips, speed, targets and sampled times before
repairing. Retain the rejected version. Do not respond to a request for more
natural stepping by removing stepping and restoring the original stiff swivel.
Determine whether the defect is choreography, contact, deformation or layering.

## Author the motion before adding corrections

Prefer an appropriate authored or retargeted clip when available. Evaluate it
on this skeleton and this outfit; matching bone names does not prove compatible
rest poses or good deformation. Procedural motion is valid when its schedule
communicates the action. Avoid independent sine waves for every joint without
support phases or a reason for the body to move.

For a turn in place, plan anticipation, weight transfer, opening step, transfer
onto that foot, trailing step and settling as appropriate to the angle and
style. Let gaze and chest lead where useful, then time root yaw to the support
changes. Small adjustments may need only a pivot; larger turns need enough
time and repositioning rather than a faster copy of a small turn. Do not make
a fixed two-step recipe a universal rule or add random foot lifts for variety.

For locomotion, match stride length and cadence to actual travel. Declare
whether the root moves in the clip or the controller; applying both can double
travel. Starts, stops, reverse travel, strafing, turning while moving and
idle-to-move blends matter as much as a looping straight walk. Preserve useful
idle breathing without allowing it to drag planted contacts or push a leg
beyond reach. Use smooth lift/landing curves where warranted, while preserving
intentional impact timing.

## Foot planting and two-bone correction

Declare the contact patch: heel, sole or ball of foot. A rigid shoe without a
toe bone can use an explicit virtual forefoot anchor. During a heel pivot,
measure that anchor, not the ankle or the full shoe orientation: the heel is
allowed to rise. A full-sole plant and a forefoot pivot are different phases.

Capture the plant anchor when contact begins. On a stationary floor, keep it
in world space until release; on a moving support, store it in that support's
local space and evaluate the support transform at each sample. Recomputing
the anchor from the moving foot every frame produces a meaningless zero-error
check. Foot orientation follows the declared support/contact phase, not an
unconditional flattened sole.

For an IK chain:

1. Measure segment lengths and a reliable knee/elbow bend plane from a known
   pose, restoring the previously sampled pose after binding.
2. Preserve lengths unless stretch is explicitly part of the brief. Handle
   coincident targets, near-straight limbs and unreachable targets without
   nonfinite transforms or sudden pole flips. Keep a stable fallback bend
   direction when the projected pole is degenerate.
3. Bound pelvis or shoulder compensation relative to character scale. Preserve
   body height and the intended weight shift; do not force a permanent crouch
   merely to satisfy contact. Report unresolved reach residuals instead of
   silently stretching limbs or detaching a carried prop from its grip.
4. Solve after the relevant base pose and before downstream attachments. Make
   ownership explicit so another layer cannot overwrite the solution or apply
   it twice. Blend influence in and out, and check the blend boundaries as
   well as the fully planted interval.
5. Use one signed-yaw convention for root and feet, including a deterministic
   tie break at exactly 180 degrees. Test both sides near the wrap boundary.

Test both turn directions, representative small and large angles, near and
exact half-turns, different body sizes and the required footwear. Include
idle sway, start/stop, cancellation and re-entry. Add slopes, stairs or moving
supports only when the delivery contract requires them; flat-floor success
does not establish those capabilities.

## Hands, held props and interaction targets

Define an actual palm/grip frame on the hand and a matching frame on the prop
or surface. Match orientation as well as position. A wrist at the right point
can still leave the palm facing upward, the fingers away from the handle, or
the object visibly floating. Review thumb opposition, finger curl and wrist
angle from palm, side and gameplay views. Simplified hands still need a
readable grip appropriate to their design.

Solve reach against the evaluated target transform. Preserve the prop's
intended dimensions under scaled parents; inspect world dimensions and shear
rather than assuming local scale one is sufficient. For a hanging bag or
large object, consider its full bounds against floor, thigh and torso. Adjust
the arm within its limits before offsetting the object away from the fingers.
Report remaining clearance/reach conflicts. Grip accuracy alone is not
collision clearance.

For first-person hands, inspect the actual camera's FOV, near plane, look
pitch extremes, idle, locomotion and interaction transitions. Relaxed hands
should not obscure the central view unless intended. Check wrists, sleeves,
fingertips, prop clipping and finger silhouette at the final output size.
Keep first-person presentation and third-person visibility as separate gates:
a private viewmodel does not create a gesture visible to another player.

Interaction gestures need anticipation, target contact, a readable hold or
manipulation, release and recovery. Reaching across a table and reaching under
it should have distinguishable silhouettes. Inspect the hand relative to the
actual table/prop, not an empty-space pose. Lower-body motion, gaze, emotes,
carry and interaction layers need explicit priorities and blend-out behavior.
Check interruption by walking, changing target, canceling or being knocked down
when those states exist. An imported clip or a successful interaction event
does not prove that an observer can see the action.

## Sitting, snaps and recovery

Honor the game's transition contract. If the brief requests instant seat
entry/exit, snap the gameplay root to validated seat/exit anchors instead of
interpolating the actor through the room. Review the discontinuity deliberately;
the mechanical-animation warning against unexplained teleports must not
override an explicit gameplay choice. Do not introduce a snap into an authored
sit-down sequence that was meant to show weight transfer.

In either case, fit pelvis to cushion, thighs to seat depth, and feet to the
floor using the real chair and character scale. Check knees, skirt/coat hems,
trousers, arms and the first-person camera through the transition. A grounded
skeleton does not prove that clothing clears the cushion. On exit or cancel,
release seat and hand targets, restore the correct pose layers and verify the
exit position. Animated falls/get-ups and simulated ragdolls are different
deliverables; do not label one as the other.

## Measure contacts without disguising failure

For each declared contact interval, record actual evaluated points and the
independent expected anchors in the same space and units. Report:

- maximum distance from the plant anchor (cumulative drift), not just the
  distance between consecutive samples, which can hide slow sliding;
- signed support-normal gap and tangential drift separately;
- grip position and orientation error, chain-length error, unresolved reach,
  and nonfinite transforms where relevant;
- sample times, worst sample and the contact phase, including blend entry and
  release as separately named intervals.

Use `max(length(actual[i] - expected[i]))` for anchor error. For a moving
support, evaluate `expected[i]` from the same fixed support-local anchor and
that sample's support transform. Report any excluded intervals and why; never
present a stable middle interval as proof that the whole transition passes.
An intentional snap is an explicitly allowed discontinuity, not missing data.

Use task-scaled tolerances fixed before repair. Keep timing and sample density
consistent between revisions; sparse samples can miss pops and clipping.
These are diagnostic measurements, not a universal naturalness score. The
surface-attachment inspector measures paired patch gaps, not ground planting,
foot orientation, gait quality or multiplayer presentation. Do not repurpose
its pass state as evidence for those unrelated claims.

## Review and export gates

Open full-body front/profile/three-quarter critical frames and close contact
views. Watch the complete motion at normal speed and inspect slow playback
around phase changes. Review weight transfer, balance, cadence, stiffness,
overshoot, foot skating, knee/elbow flips, intersections and gesture readability.
A contact sheet alone cannot establish timing. If playback cannot be inspected,
record that limitation rather than claiming it was watched.

When an export is required, establish whether the consumer needs baked deform
bone animation or reconstructs IK at runtime. Blender control rigs, constraints
and drivers are not themselves a portable runtime solver. Bake evaluated motion
when required, preserve the editable rig, and compare a fresh import with the
same action, times, root motion, scale, axes and contacts. Do not claim runtime
IK delivery from a baked clip, or contact retention on new terrain from fixed
animation. Verify control-bone inclusion/exclusion against the actual export
contract.

For an engine-integrated brief, inspect the actual imported rig and cameras.
For multiplayer gestures, capture the owner's view and a separate observer's
view through start, contact, cancel and recovery; exercise late join or state
reconstruction if required by the game. Keep source, fresh-import, live engine
and network findings separate. Blender-only work may finish with runtime gates
explicitly unverified; do not claim to have improved a game's movement without
testing its implementation.

Retain a revision only when the targeted defect improves without regressing
the required contact, deformation, timing and observer gates. If the motion
still looks forced despite excellent metrics, repair the motion schedule or
base clip rather than loosening thresholds or falling back to a known defect.
