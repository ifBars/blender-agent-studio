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
