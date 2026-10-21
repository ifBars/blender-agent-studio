# Construct characters as connected surfaces

Use this construction pass before materials and accessories. It supplements
the form review with ways to build the required shapes. It is not a universal
anatomy preset: reference proportions and intended stylization remain binding.

## Preserve a whole character while refining regions

Start with a complete low-detail body, including recognizable hands and feet.
Record head, shoulder, elbow, wrist, pelvis, knee and ankle landmarks in one
coordinate system. Check front and profile before committing to detail. If the
primary silhouette is uncertain, compare two inexpensive proportion variants
with identical cameras; do not generate multiple fully dressed characters.

Choose one coherent reference set for the intended sex, age, build and style
before placing these landmarks. When the brief calls for male and female
variants, establish separate proportion specifications and neutral front,
side and three-quarter reviews for each. Do not reuse the same torso and
pelvis with only a head or clothing swap. Review shoulder breadth, ribcage,
waist, pelvis, limb lengths and muscle/fat distribution together, using the
selected references rather than universal male/female ratios. Individual
variation and intentional androgyny are valid; accidental mixing of unrelated
reference proportions is a construction error.

For an unspecified body type, choose and record a coherent reference-backed
build. Keep that choice consistent through refinements. Fit clothing to the
body, and check the underlying silhouette before garments hide it. A single
successful body type does not validate the other variants; render and pose
each required proportion specification before approving a character family.

Organize refinements by region, but keep shared boundary loops and neighboring
landmarks fixed unless their change is intentional. A region is a work area,
not necessarily a separate Blender object. In particular, shoulder/chest,
thumb/palm, hip/crotch and ankle/foot are coupled surfaces.

Keep an accepted source checkpoint. After each regional change compare both
the close-up and the whole body; revert or repair collateral proportion loss.
Do not make a region bigger simply to make its details easier to see.
Do not invent knee pads, shoulder caps, armor plates or bulky cuffs to cover
weak joints. Add protective gear only when the brief or references support it;
"utility clothing" alone does not require bright discs on the knees. Review
the uninterrupted underlying garment silhouette before adding justified gear.
Stop decomposition at a useful modeling unit: a finger includes its palm
attachment, a boot includes its ankle opening, and a shoulder includes the
underarm. Independent isolated parts cannot satisfy these relationships.

## Adapt anatomical templates without inheriting their defects

A licensed anatomical mesh can supply connected face and hand topology, but
does not establish the requested identity, proportions or clothing. Record the
asset's source revision and license separately from its application's code
license. Inspect imported groups: fitting cages, joint markers, teeth and eye
helpers are not automatically renderable character surfaces. Retain the source
data and document which groups became visible geometry.

Define garment regions in the unposed mesh using stable topology, groups or
weights, then carry those regions through posing. Selecting trousers by height
after lowering the arms can also select forearm faces. Inspect every resulting
component and opening before deriving belts, hems or accessories from its
boundary. A valid mesh operation does not establish anatomical ownership.

Fit seams, brows, laces and other surface details to the evaluated supporting
surface. Coordinate guesses can bury a brow in the forehead or leave a lace
floating above a shoe. Check the projection direction and missed hits, then
inspect attachment from another angle. Preserve intentional clearance and
avoid projecting through the intended surface onto its far side.

Review garment overlap and footwear contact in an opaque silhouette pass as
well as a shaded close-up. A narrow waist gap or an upper that touches its sole
only at the centre can disappear in a full-body beauty render. Recheck the
same regions after subdivision and fresh export.

Inspect shell modifiers on a representative hand, shoulder and scalp before
applying them across an outfit. Smoothing can shrink a fitted shell through the
body; retain a clearance check after smoothing, including when using a
volume-preserving method. If thickness creates long spikes, compare the raw
surface with the evaluated result and inspect degenerate corners, normals and
Solidify's even-thickness setting. Correct the cause and recheck openings and
clearance; reducing thickness alone can hide a defect without repairing it.

For image-backed materials, use explicit output paths, confirm the bake files
exist, and pack or embed the required images. A successful background build
does not establish that its textures were saved. Compare those materials in a
fresh import under the same lights and color management.

## Hands: build the palm into the fingers

Use a palm with width, thickness, a curved knuckle line, a narrower wrist, and
a thenar volume at the thumb base. Distinguish dorsal and palm surfaces.
Block all five digits before nails, glove seams or wrinkles.

- Extrude four finger roots from openings in the distal palm. Leave actual
  webs between the openings. Join their boundary vertices; intersecting closed
  finger tubes are not a connected hand.
- Stagger root positions and lengths. The little finger starts lower and is
  shorter; the middle finger is normally longest. Adapt to the reference.
- Use several tapered sections per finger. Place sections before, at and after
  each intended bend, with a rounded or deliberately faceted fingertip.
  Avoid four equal straight rectangles extruded from a slab.
- Branch the thumb from the SIDE of the lower palm, rotate it out of the palm
  plane, and shape its fleshy base. It must oppose the fingers in a grip;
  a fifth parallel finger or a sphere stuck to the wrist cannot do that.
- Give a relaxed hand slight finger flexion and a small natural spread.
  Inspect palm, dorsal and edge views. A full-body render cannot reveal webs,
  doubled faces or thumb orientation.

For procedural construction, use a connected palm cage with faces extruded
into tapered finger loops, or a licensed topology template adapted to the
brief. A low-resolution union/remesh is acceptable for establishing volume,
but inspect the finger gaps and rebuild deformation topology before skinning.
Keep the hand large enough in diagnostic images to see each digit.

An explicitly requested mitten or distant crowd hand can simplify the digits;
do not silently replace visible hands with fists or mittens to avoid modeling.
Gloves still have an anatomical palm, thumb and fingers.

## Shoes: solve the footprint and profile together

Define the top outline and side profile before adding laces:

1. Mark heel, ankle center, instep, ball of foot and toe tip. Check total length
   against the lower leg and hand, using the chosen character references.
2. Shape a footprint that is narrow at the heel/waist, widest at the ball,
   and tapers or rounds into the toe. Distinguish the medial and lateral sides.
3. Loft cross-sections along the foot. Their widths follow the footprint;
   their heights rise at the instep and fall into the toe box. The toe is not
   the same height or width as the ankle. Avoid a flat-topped wedge.
4. Build the ankle shaft/opening into the upper. Fit the trouser hem to the
   opening rather than placing a closed cylinder on top of a closed shoe.
5. Derive the outsole and welt from the same footprint. Keep sole thickness,
   heel separation and toe spring appropriate to the reference. Never scale
   the sole independently until it becomes a second oversized shoe.
6. Place tongue, eyelets and laces on the evaluated upper surface. These are
   finish details, not substitutes for heel/instep/toe geometry.

Inspect top, outside profile, front three-quarter and ankle contact. For paired
shoes, mirror the footprint and preserve outward normals; do not merely
duplicate the same asymmetric shoe on both feet.

## Joints: construct and test before dressing

Build elbow/knee bend zones with rings on both sides of the joint and a ring
at the joint, adding density only where curvature needs it. Preserve the
outside prominence and provide enough inner surface to compress without
folding through itself. A straight tube with only endpoint weights has no
usable bend region.

For shoulders, connect the deltoid to chest/back with an actual underarm loop.
Place the arm pivot inside that form. Raise the arm during construction to
expose webbing or a collapsing armpit. At the pelvis, build a continuous seat
and crotch bridge between leg openings; do not cap two thighs inside a torso.
Inspect the neutral shoulder from front, rear and above: a recessed seam,
pinched neck-to-shoulder transition or protruding arm cap can read as detached
even when a voxel union reports one connected component. Shape the clavicle
slope, deltoid and sleeve into one deliberate transition. Technical connectivity
does not establish visual continuity.

In a procedural sleeve, do not start with a narrow capped tube and enlarge
the next section into a ball at the arm root. That produces a shoulder cap
even after union/remesh. Build the chest-to-arm transition as a shared surface:
carry the chest/back edges into the arm opening, shape the top along the
clavicle slope, and bridge the lower boundary through the underarm. Compare
the silhouette without pockets, contrasting materials or shoulder accessories.
A conspicuous ball, ledge or circumferential groove at this junction is a
failed form check unless explicitly required by the design. Repair the
transition in the source; do not merely smooth it and declare the one-component
topology a pass. Retain the failed and repaired front, rear and raised-arm views.

Assign weights by anatomical region and distance along the appropriate bone
chain. Blend across a finite joint band; do not use a single height threshold
for the whole body or nearest-bone distance across nearby opposing limbs.
Inspect the weights on the inner and outer bend separately. Neighboring
vertices should transition smoothly without dragging unrelated regions.

Test a temporary bend while the surface is still simple. If it fails, diagnose
in this order: pivot placement, rest shape, loop placement, weight transition,
then corrective deformation. Subdivision cannot repair a wrongly placed
pivot, and more smoothing cannot restore missing joint volume.

Match the native and exported evaluation order. A native armature followed by
subdivision can look smooth while an export that subdivides the rest surface
before skinning develops a different fold. For a portable finalized mesh,
preserve the editable cage separately, finalize the intended rest topology,
then compute the region-local weights on that surface and deform the same mesh
in both native and exported paths. Recheck the poses; changing modifier order
alone may expose a bad weight field rather than repair it.

Make region membership continuous too. A smooth along-bone blend still creates
a seam if a hard torso-height or lateral cutoff suddenly assigns adjacent
vertices entirely to the spine. Fade the arm contribution through a finite,
locally appropriate torso/underarm band (for example, a clamped smoothstep
mask), retain the remaining spine weight, and normalize. Adapt bands to the
chosen landmarks; do not copy universal world-coordinate thresholds.

For procedural cages, preserve semantic arm/hand membership through rest
subdivision instead of reconstructing it from final world-space coordinates:
mark arm interior and attached hand vertices as 1, unrelated torso as 0, and
blend only the shared shoulder boundary. Apply the rest subdivision with those
construction groups intact, read their interpolated weights as the arm mask,
then multiply the along-bone weights by that mask. Assign the remainder to the
appropriate torso bones and remove construction groups before export. A hand
can lie below the torso cutoff in an A-pose; a height mask can leave it bound
to the spine and stretch it into spikes when raised. Verify both invariants:
unrelated waist vertices stay still during an arm-only raise, and hand skin
has no residual torso influence. A smooth blend alone proves neither.

Do not rely solely on Blender's Preserve Volume option: ordinary exported
skinning may deform differently. Inspect the fresh export in the same bend,
reach and twist poses. If native corrective shapes or helpers are necessary,
verify that the requested export actually carries their effect.

## Keep low-poly and realistic construction distinct

Preserve intentional cartoon proportions, oversized heads, short limbs,
mitten hands and simplified shoes when the brief or reference calls for them.
Do not "correct" a coherent goofy character into a realistic adult. Surface
continuity and attachments still matter with exaggerated anatomy.

For low-poly work, place edges deliberately around silhouette changes, finger
webs, thumb opposition, shoe profile and bending joints. Flat shading is a
presentation choice, not a construction method. Do not globally decimate away
the few edges that explain anatomy.

For realistic work, establish skeletal landmarks and primary masses first,
then secondary volumes and asymmetry, then skin detail. A face photograph or
normal map does not supply a skull profile, eyelids, ears or hand anatomy.
Use compatible references or an authorized base mesh; retain its license and
document reuse. Do not claim a realistic-human result from a stylized test.

## Make clothing and attachments follow the right surface

Classify each attachment before binding it:

- Rigid items such as glasses, a belt buckle or a shoe sole follow their
  appropriate bone or rigid region. Preserve the intended rest-space offset.
- Flexible layers such as socks, cuffs, sleeves and straps follow the
  underlying deforming surface. Transfer/interpolate weights from the
  corresponding local body region, then inspect; do not choose the nearest
  vertex across both legs or through another garment.
- An item spanning a joint needs a deliberate transition. A sock cuff usually
  follows the lower leg; its lower section may blend toward the foot. The shoe
  sole follows the foot, while the ankle opening must accommodate ankle flexion.
  Making the entire sock rigid to the foot leaves an upright tube behind the
  moving shin. Binding it entirely to the shin can drag it out of the shoe.

When procedurally aiming bones, preserve the complete rest frame, including
bone roll. Rebuilding orientation with a fixed track/up quaternion can flip a
shoe even when the bone points the right way. In armature coordinates, use the
shortest rotation from the rest direction to the desired direction, multiplied
by the rest rotation; choose a deliberate axis for an antiparallel target and
handle intended twist separately. Use Blender's pose/local-space conversion
for the parent chain. A zero-motion test must reproduce the full rest matrix,
not just the head/tail positions. Pose-bone location channels are local, not
world-space root displacement.

For a walk, test world-space sole height AND horizontal sole displacement over
each stance interval. Moving the root to make a foot touch the floor can still
leave it sliding; a floor rendered under each posed bound hides both problems.
Sample every authored frame plus passing/toe-off extremes in native and fresh
export, preserving a fixed world floor. Contact checks do not approve garment
clearance: inspect sock/shin and sock/shoe intersections separately.

For a clearance adjustment to an already bound garment, preserve its accepted
support correspondence and weights unless rebinding is intentional. Recomputing
a distance-based field at displaced sock vertices can change their joint
ownership and worsen penetration despite a larger rest-space gap. Compare the
same poses after a geometric offset, and test rebinding as a separate change.

Bind geometry in the same rest coordinate system as its driver. Avoid applying
the same bone motion twice through both bone parenting and an armature
modifier. Verify modifiers reference the intended armature and every required
vertex has normalized weights. Sharing a rig object or assigning a material
does not establish that an accessory follows the body.

Fit clothing details to the evaluated garment surface. Backpack straps need
both endpoints connected to the pack and a plausible route over the shoulders;
a hanging curved rod in front of the chest is not an attached strap. Shoulder
bags may hang deliberately, but their strap must meet the bag and body.
Glasses need a supported bridge and temples; inspect them from the side.

Before replicating an outfit across a character family, validate one complete
representative with the actual skeleton and action. Test both legs at maximum
ankle flexion, foot lift, toe-off and a passing pose. Compare rear and side
close-ups of the shin/sock/shoe junction; also inspect full-body motion so a
locally aligned ankle does not conceal sliding or floating feet. Inspect
straps during arm raise and torso twist. Repeat these checks after export.
Idle-only evidence is insufficient for animated outfit variants. After a
body-proportion change, refit and rebind affected clothing before reusing it.

## Review gate before accessories and final textures

Use neutral/clay full-body front and profile images, plus close-ups of a hand
from palm/dorsal/edge, shoes from top/profile, and the bent joints when rigged.
Use the same cameras and framing for the before/after regional comparison.
Materials can be restored after the construction passes.

Record each unresolved defect and repair its source. Inspect skin continuity
using geometry, not object names: joining objects does not weld their meshes.
Once the primary forms pass, add clothing detail, preserving the accepted
shape. Recheck affected regions after the final edit and after export.

## Editable starting cages

Two optional Blender-Python helpers provide a small executable starting point
for stylized adult humanoids. They use shared vertices without boolean unions,
voxel remeshing or third-party assets. Import them from this skill's `scripts`
directory; do not install them as an add-on or use them as an arbitrary MCP tool.

- `build_upper_body.create_upper_body(...)` makes a continuous torso with arm
  openings bridged into tapered arm loops. Defaults are a 1.75 m adult blockout,
  +Z up and -Y front. `width` and `depth` alter torso proportions; `arm_drop`
  is 15–65 degrees below horizontal. `scale` multiplies all coordinates.
  Waist, neck and both wrists are deliberately open for further construction.
- `build_hand.create_hand(...)` makes one connected capped hand with four
  staggered finger roots and a side-branching thumb. Local +Y runs from wrist
  toward fingers, -Z is the palm, -X is the thumb. The default hand is roughly
  3.8 units long; choose `scale` from the requested hand length (for example,
  about 0.047 for an 18 cm starting hand), then inspect actual dimensions.
  `mirror=True` reflects local X and repairs winding. Width, length, finger
  length and thickness are independent multipliers.

The helpers are also checked for nonadjacent evaluated surface intersections
across sampled proportion settings. This catches folded underarms and thumb
roots that a closed-manifold test misses. It is not a guarantee for every
positive multiplier, a collision-free pose, or finished anatomy. Inspect
unsubdivided and final surfaces whenever changing proportions.

Both return linked editable mesh objects and optionally add subdivision.
Construction vertex groups mark regions, wrist loops and digit tips; they are
NOT skin weights. Remove/exclude them when normalizing deform groups. The upper
body's ten-vertex wrist and the hand's sixteen-vertex capped wrist do not match:
remove the cap and bridge the ordered transition loops as described below.
Joining objects or overlapping the wrists does not connect the surfaces.

Fit sleeve surfaces to the accepted body cage (or derive them from its faces),
then skin them consistently with the body; do not place an inflated shoulder
sphere over the arm root. These helpers do not supply weights, corrective
shapes, garment clearance, feet, head or reference-backed sex/build variants.
They do not establish deformation quality. Test the brief's raise/bend/twist
poses and fresh export before accepting a generated character. Preserve the
requested style; do not force realistic or cartoon briefs into these defaults.

### Join the wrist instead of overlapping it

`build_hand.bridge_wrist_loops(arm_loop, hand_loop)` returns connecting faces
for ordered loops in one mesh, including the helpers' 10-to-16 vertex case.
It does not guess placement or transfer weights. Use this short construction
sequence before rigging:

1. Transform both cages into the same rest-space coordinates. Match the wrist
   centers, orientation and width; leave a short, positive-length transition.
   Check that the thumb points inward/palmward on the correct side.
2. Copy the hand vertices into the body's vertex array and offset its face
   indices. Remove all hand-cap faces whose vertices are entirely in the
   `wrist` group. The upper-body wrist is already open.
3. Order both boundary loops around the forearm axis, starting on the same
   physical side and traversing in the same direction. For approximately
   convex wrist loops, sort by `atan2(offset.dot(palm_normal),
   offset.dot(wrist_width_axis))` in the same local basis for both loops.
4. Append `bridge_wrist_loops(arm_loop, hand_loop)` to the combined face list.
   Recalculate normals and inspect palm/dorsal/edge views. The new faces share
   both existing boundaries; merely joining Blender objects is insufficient.
5. Assign region-local normalized deform weights across the transition after
   finalizing its topology. Test wrist bend/hand-forward and fresh export.

The bridge function rejects repeated, overlapping or malformed index loops.
It cannot detect incorrect geometric ordering, self-intersections, an excessive
transition gap or poor weights. The regression fixture joins an actual open
hand wrist to a ten-vertex forearm ring and checks a single closed surface;
visual pose/export review is still required.
