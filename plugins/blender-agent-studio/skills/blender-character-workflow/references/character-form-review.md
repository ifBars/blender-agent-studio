# Character form and fit review

Use this review for humanoid creation and substantial shape repairs. Adapt the
anatomy checks to a creature's species; do not force human ratios onto animals.
These checks address recurring defects observed during character authoring,
including GPT-6/Astra sessions. They are workflow guardrails for any model, not
proof that one model always fails or that these instructions guarantee quality.

## Establish proportion before detail

Open compatible front, profile and three-quarter references and compare them
with fixed, similarly framed renders. Use supplied model files for inspection
when available: inspect their actual silhouette, topology, UVs and proportions
in Blender, with documented scale/pose differences. Do not copy their mesh or
textures into the deliverable unless reuse is authorized and licensed.

Record reference-relative relationships, not just total height:

- shoulder and chest width relative to head width; torso depth in profile;
- shoulder-to-waist and waist-to-crotch lengths relative to the legs;
- pelvis width, thigh taper, knee location and ankle width;
- boot length relative to lower leg length, boot width relative to ankle, and
  sole thickness relative to the whole shoe;
- palm, finger and thumb length/width, and cap crown/brim relative to the head.

Keep head height, camera and framing fixed during comparisons. Foreshortened
photos do not justify precise measurements. Label uncertain ratios and preserve
intentional stylization. Do not apply a universal adult ratio, a fixed torso
shrink percentage or a mandatory triangle count to every character.

An oversized, deep, straight-sided torso and oversized boots are high-priority
suspects. Check both before painting textures or adding pockets, seams and laces.
Do not add detail to an oversized shape and call the scale problem resolved.
Low-poly/PSX style still requires deliberate taper, joint placement and curves;
it does not authorize a box torso, rectangular shoes or disconnected limbs.

## Inspect construction rather than object names

### Torso and clothing

Shape ribcage, waist, pelvis and shoulder transitions in front AND profile.
Avoid a box with arms attached. Clothing allowance should be visible but should
not inflate the body a second time. Inspect a neutral/clay view as well as the
textured surface so folds do not disguise oversized volume.

Belts must follow the waist, with a plausible section and buckle attachment.
Vests need fitted front/back/side surfaces, armholes and neck openings. Check
pockets, flaps, zipper, hem and shoulder straps against the evaluated garment
surface. Flat boxes on a curved shell commonly float or disappear into it.
A zipper needs continuity across the curved and deforming surface, not merely
a narrow box with the right name. Preserve cloth thickness and intended layers;
do not hide fit problems by expanding the entire vest or disabling backface culling.

### Pelvis and joints

A mesh joined into one Blender object is not necessarily continuous geometry.
Overlapping capped leg tubes and a separate pelvis are not a finished trouser
crotch. Build a continuous seat/inseam transition when the garment is continuous.
Do the same for sleeves/shoulders and visible neck/wrist transitions. Separate
layers and intentional seams can remain separate; do not weld every accessory.

Use topology and skin weights that preserve the joint in motion. Remesh, smooth,
bevel and decimate are methods, not proof of success: inspect their evaluated
shape, UVs, material boundaries, influence count and export cost. Avoid underarm
webbing, hip ledges, pinched crotches, detached ankles and collapsing elbows.
Bone endpoint continuity alone cannot detect a torn or overlapping skin surface.

### Footwear and hands

Model a shaped heel, instep, ankle opening and tapered toe box. Review the top
outline and side slope; a beveled rectangular prism still reads as a block.
Add only reference-supported detail at the intended viewing scale: outsole/welt,
heel separation, tread, tongue, lacing/eyelets and panel seams. Keep these attached
to the shoe surface. Added detail must not enlarge its overall silhouette.

After resizing footwear, preserve the ankle relationship and sole contact and
update all attached parts together. Do not accidentally scale the leg/rig or
leave laces, soles and heel details behind. Compare the whole character again,
not just a flattering shoe close-up.

Check the thumb against all four fingers and the palm. It needs a plausible base,
joint, taper and tip, not an oversized ellipsoid. Inspect both hands in neutral
and gripping/reaching poses when required. Keep finger spacing and lengths
intentional; state when only hand-level bones exist and individual grips are
not supported. A cap brim should curve, thin and attach to the crown naturally;
a projecting slab or unanchored disk is unfinished.

## Check skin as one material system

Open a head close-up from front and both three-quarter/profile directions. Compare
face, modeled nose, ears, side/back of head, neck and hands. A photographed or
painted front face pasted onto a different solid skin color is a defect even
when every mesh has a valid material. Texture detail should remain consistent
across exposed regions, not stop abruptly at the front-facing polygons.

Diagnose the mismatch before editing: material assignment, UV region/padding,
image color space, baked illumination in the albedo, normals, roughness and scene
lighting can each cause it. Compare base color under neutral lighting with the
final lit result. Do not assume a color-space bug without checking the settings,
or recolor every patch independently by eye. Use a coherent skin palette/atlas
and appropriate UV transitions; preserve intentional beard, lips, hair and
anatomical shading. Check transparent-image borders and texture compression
for dark seams after export. Nose/ear geometry must not sample unrelated beard,
eye or background texels. A color fix does not replace a profile shape review.

## Evidence and regression gate

Review once at the proportion stage, after a coherent fit/material pass, and
after export. Revisit affected checks after user corrections. Do not wait for
the user to enumerate the next obvious oversized or disconnected part.

Minimum useful coverage for a clothed humanoid:

- fixed full-body front, back, profile and three-quarter views at the same scale;
- head/ear/nose/neck, hands/thumbs, boots, waist/crotch and shoulder close-ups;
- evaluated walking/running, reach, hip/knee/elbow bend and required grip poses;
- an actual motion preview when animation is part of the request, checked for
  foot sliding, ground penetration, clipping and mesh gaps between key poses;
- fresh-import materials/weights and the target engine view when engine
  integration is part of the contract.

For each suspect area record: reference observation, view/frame, visible defect
(or no defect observed), source-level repair, and the rerender that verifies it.
Use `unclear` when a small contact sheet cannot resolve the feature and open a
close-up. Do not claim visual acceptance from triangle counts, normalized weights,
bone connectivity, a successful export or network parameter replication alone.

After a shape repair, recheck full-body proportion, adjacent surfaces, texture
stretching and relevant poses. Keep render/export/build inputs frozen while jobs
run. Regenerate affected previews from the final source revision; mark old
preview folders as historical rather than handing them off as current evidence.
Stop when the requested checks pass. Report concrete remaining defects or
unverified runtime behavior without claiming universal perfection.
