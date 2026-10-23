# Character form and fit review

Use this review for humanoid creation and substantial shape repairs. Adapt the
anatomy checks to a creature's species; do not force human ratios onto animals.
These checks address recurring defects observed during character authoring,
including GPT-6/Astra and Claude Opus 5.5 sessions. They are workflow guardrails
for any model, not proof that one model always fails or that these instructions
guarantee quality.

## Accept brief-defining features against opened references

Before detailing, name the features that decide whether the brief succeeds.
For a realistic human, these are the face, hair, hands and the named clothing and
footwear types. For a known character, they are its identifying features, for
example mouth and teeth, ears, hands and a signature garment pattern. For an
original stylized character, they are silhouette and expression. Keep one row
per feature in the review notes:

| Feature | Acceptance basis: opened reference (file, view), brief/approved design, or `unreferenced` | Matched model view | Concrete differences | Verdict |
| --- | --- | --- | --- | --- |

Use `accepted`, `partial`, `failed` or `unverified` as the verdict.

- A reference counts only after the saved file is verified as an image and
  opened. A rate-limit or HTML response is a failed retrieval. Before building
  the feature, retry through another host, page or search. Coverage is per
  feature: a body-proportion chart does not cover the face, and a hand photo
  does not cover footwear.
- When a realistic or likeness feature depends on external evidence that
  remains unreferenced, build it from stated assumptions and rate it no higher
  than `partial`. A realistic or likeness claim requires an accepted face. An
  original design feature can be `accepted` against the user's brief or an
  approved design without a source photo.
- Reopen the reference whenever you review that feature; notes written at the
  start do not substitute for it. Render the model at the reference's approximate
  angle and crop, with `blender_fit_reference_camera` and
  `blender_compare_reference` when available, and compare side by side.
  Describe differences as shapes, not adjectives. For example: "separate
  rounded teeth over exposed red gum, but the reference has one continuous row
  of square upper teeth," or "the ear is a large flat disc behind the jaw, but
  the reference has a small cup at nose height."
- If no reference covers a profile or rear view, its reference fidelity is
  `unverified` (inferred). Still render and review those views for silhouette,
  continuity and intersections. Judge a stylized feature against references or
  the approved design in the same style; do not penalize intentional
  stylization for not being realistic.

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

When the brief names a footwear type, retrieve a reference for it, then reproduce
the features that reference shows so the type reads at delivery distance. If the
hiking-shoe reference shows a lugged outsole, toe bumper, eyelets and padded
collar, for example, check each one in profile and three-quarter views. In one
retained run with no shoe reference, flat lace bars on a smooth upper read as a
casual shoe.

### Face and hair

For a realistic face, build each eyeball inside upper and lower lids that have
thickness. Add the brow ridge and orbit, cheekbone and nasolabial planes,
philtrum, lip corners and a jaw-to-neck transition. Openings carved into a smooth
ellipsoid union read as a mannequin. Confirm that the head matches the requested
character's identity, age and design proportions from full-body distance as
well as in close-up.

Hair needs volume above and behind the skull, a soft hairline and readable
flow or parting from front, profile, back and top. A uniform offset of the scalp
with a periodic ripple reads as a cap or helmet. Use clumped locks, cards or
sculpted masses as the style requires. A jagged cut boundary is not a hairline.

## Check skin and surfaces as one material system

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

Inspect the forehead, cheeks, neck and chest under raking light. Regular bands
or grid lines on a smoothed voxel union may reproduce the facets of
low-resolution input primitives. Test that hypothesis by inspecting the input
geometry, for example the primitive segment counts or normals along a line
across the band. If the facets are the cause, increase the primitive resolution
or subdivide the primitives before the union, then rebuild. Smoothing may also
erode the nose, lips and other small features, so inspect them after any
smoothing.

In one retained static trial, eight Taubin smoothing iterations left the bands
visible. Rebuilding the head from 64x32 ellipsoids instead of 24x14 visibly
reduced them in native and fresh GLB renders, adding 0.13% to the triangle count.
That is one trial's evidence, not a prescribed resolution or a measure of how
often this cause occurs. The trial fixed this surface artifact only; the face was
still unrealistic.

Compare native and fresh-export renders from the same view. glTF does not carry
procedural shader detail such as noise bumps or a procedural knit. If a
pattern identifies the character or garment, model it or bake it into the
exported textures, then confirm it in fresh-import renders. Otherwise, report it
as native-only. A pattern too faint to read at delivery distance is not accepted
in either file. Matching material counts do not prove matching shading.

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

If a brief-defining feature is `failed` or `partial` and budget remains, spend
it on that feature before secondary detail or extra technical passes. Deliver the
feature table with the final evidence. Claim the brief only when every
brief-defining feature is `accepted`; otherwise report the result as incomplete.
