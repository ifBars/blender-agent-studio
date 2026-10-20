# Character workflow validation

This is draft work. The sampled comparisons show some visual gains, but
shoulders, hands and body proportions still need adjustment.
The attachment inspector measures selected constraints; it cannot approve a
character's anatomy or appearance.

## What changed

The construction guide starts with whole-body landmarks, then refines connected
regions: shoulder/chest/underarm, palm/thumb/fingers and ankle/foot. It covers
footprint and profile construction for shoes, local deformation weights and
attachment ownership. Unrequested knee pads and shoulder caps must not conceal
unfinished joints. Cartoon proportions and intentional mitten hands remain
valid design choices.

Character creation, animation, procedural families and asset validation now
share a repair loop: preserve evidence, identify the defect, repair the source,
repeat the same views and poses, and inspect a fresh export. A changed surface
binding requires renewed review.

`blender_inspect_attachments` samples evaluated mesh patches across animation
frames and projects their positions into compatible SceneIR anchor objects.
The existing Rust connection analyzer measures each declared pair. This adds
surface deformation evidence without changing SceneIR's wire schema or adding
an arbitrary Python execution tool.

Evidence rendering now respects render-hidden collection ancestors and
view-layer exclusion. A glTF rig helper in `glTF_not_exported` previously
enlarged the framing bounds despite being invisible in the render. That
placed the diagnostic floor below the character and could produce empty
foot close-ups. The correction is evidence settings version 3; a live
regression also tests nested hiding and multiple collection links.

## Paired scout generation

The baseline is commit `d5cf1a3c773dacdc89aa83aa85d251426533f153`.
Both conditions used the unchanged `game_scout_deformation` task, GPT-6 Astra
at medium reasoning, a 20-minute generation limit and Blender 5.2.2 LTS.
The candidate used a frozen revision of the construction guidance. It did
not use the new attachment inspector. Later shoulder and male/female
proportion guidance is not covered by this generation comparison.

Both conditions received the same resource guidance: two Blender CPU threads,
GPU rendering when available, 32-sample diagnostic renders, 512-pixel body
views and 640-pixel details. The evaluator rendered matching 384-pixel views
with Eevee. Some validation ran concurrently; these runs do not establish a
performance improvement.

| Observation | Original guidance | Revised guidance |
| --- | --- | --- |
| Raw automated score | 95 | 95 |
| Automated hard gate | Failed | Failed |
| Evaluated triangles | 51,404 | 50,372 |
| Deform skeleton bones | 17 | 23 |
| Assigned materials | 7 | 7 |
| Blinded visual preference votes | 0 | 3 |
| Deformation criterion passes across judges | 5 / 9 | 8 / 9 |

The failed hard gate is the separate `head` object-name requirement. Both
characters include a visible head in the continuous body mesh. The original
results remain unchanged; neither run is reported as an automated pass.
The new cartoon fixture permits a head inside its continuous body instead of
requiring a separate object name.

Three counterbalanced Astra judging passes preferred the candidate. They are
model judgments of one generated pair, not independent human evaluations or
three generation replicates. Visual inspection found clearer fingers, less
inflated footwear, no arbitrary knee discs and an actual overhead reach.
The candidate still has bulbous shoulder transitions and unfinished hand
anatomy. Neither result establishes realistic character quality, strict
low-poly quality or reliable male/female proportion variants.

## Cartoon and static humanoid comparisons

Two further pairs used the same model, reasoning level, time budget and
resource guidance. Every candidate used the same frozen construction guide;
the new attachment tool and later proportion guidance were not part of
generation. There is one completed generation per condition for each task.
An earlier interrupted cartoon baseline has no summary and remains retained
outside Git. Its cause was not confirmed; it is not counted as a quality
failure or silently replaced in the evidence archive.

| Task | Raw baseline score | Raw candidate score | Hard gates |
| --- | --- | --- | --- |
| Cartoon outfit walk | 94.67 | 94.67 | Both failed |
| Static ranger | 100 | 95 | Baseline passed; candidate failed |

Both native cartoon scenes contain a 200 m staging floor and a head inside
the continuous body. They fail the extent and separate-head naming checks.
The raw overviews frame the floor and cannot support character-quality
judgments. Supplemental renders load both GLB exports without staging, using
identical settings and framing rules. These do not overwrite or rescore the
native results.

The first supplemental cartoon renders also exposed the hidden rig-helper
framing bug. Those images and three judgments remain preserved, but corrected
version-3 renders and fresh judgments replace them as the primary visual
comparison. Supplemental 640-pixel foot views inspect frame 13. Their
diagnostic floor follows the posed bounds, so they establish local shape/fit,
not world-space ground contact or continuous animation quality.

All three corrected cartoon judgments preferred the candidate. Shoe criterion
passes changed from 0/3 to 3/3, ankle continuity from 2/3 to 3/3, and joint
continuity from 1/3 to 3/3. Support remained 2/3 for both; one judge flagged
apparent floating in the candidate. These are sampled-pose judgments and do
not establish continuous timing, loop quality or between-frame contact.

The ranger export comparison uses matching version-2 renders, which did not
have the rig-helper problem. Two of three model judgments preferred the
candidate; one preferred the baseline. The candidate's missing `body` name
causes the automated regression: visible body surfaces are named
`Jacket_continuous_shoulders` and `Trousers_continuous_seat_inseam`.
The failed non-regression gate remains a failure. A visual majority does
not override it.

The ranger's baseline close-up still has webbed, stubby fingers despite its
100-point structural score. Matching hand close-ups show more separated,
tapered fingers in the candidate, but the palm and thumb remain simplified.
The cartoon candidate also reports sleeve/underarm intersections and
stretching during exaggerated reach. None of these runs proves a finished
production character.

## Controlled attachment repair

A separate synthetic fixture reproduces a sock staying upright while the
skinned shin bends. The repair adds the missing armature deformation to the
sock; the rest mesh, lighting and camera remain the same.

Using the same small front/back patches, frames and 7 mm tolerance, the worst
front gap changed from 143.27 mm to 5.00 mm. The back gap changed from
134.48 mm to 5.00 mm. Frames 7 and 13 were repaired with no newly failing
sampled frames and unchanged binding hashes.

The live integration test also checks a freshly imported GLB using verified
export selectors. It verifies that unchanged object transforms can conceal
surface drift, that topology-changing modifiers are rejected, that source
files are preserved, and that the MCP tool accepts a preserved baseline.
This demonstrates a measurable attachment repair, not generated shoe quality.

## Remaining work

- Refine shoulder/chest/underarm surfaces and inspect elevated-arm poses.
- Improve palm/thumb transitions, finger webs and relaxed hand shape.
- Validate separate reference-backed male and female proportion specifications,
  including clothing fit and motion, rather than changing only heads or outfits.
- Expand repeat generations and human review before claiming reliable gains.
- Correct the existing character benchmark's naming and staging assumptions
  before using its raw scores to approve anatomy or character completeness.
- Treat centroid distances as selected constraints: they do not establish
  collision freedom, orientation, continuous seam contact or unsampled motion.

Raw models, renders, generation traces and comparison manifests stay outside
Git. The draft PR carries representative screenshots.

## Executable starting cages (follow-up)

The follow-up adds two optional, original Blender-Python construction helpers:
`create_upper_body` bridges explicit torso openings into tapered arm sections,
and `create_hand` extrudes four distinct palm openings and a side thumb opening.
They are small editable starting cages, not a character-generation framework,
finished anatomy, reference-backed body variants, garments or a rig. Their
construction groups must not be mistaken for normalized deform weights.

Topology tests run inside real Blender and check connectivity, intended open
boundaries, distinct digit caps, symmetry, winding and input validation. These
tests establish the helper contracts, not visual or deformation quality.
Neutral helper renders were inspected from front/rear/above and palm/dorsal/edge.
The shoulder silhouette is continuous without a separate spherical cap; the
hand has separated tapered digits, actual webs and an out-of-plane side thumb.
The torso remains a simple blockout and the hand's web-root surface is still
faceted. Further modeling, deliberate wrist joining, clothing fit and pose
review remain necessary.

### Follow-up evaluation protocol

The original source assets behind the comparisons above were not available in
this workspace. Their screenshots and historical results are unchanged.
A new pair therefore compares frozen PR head `dd32503` with the helper-bearing
workflow using the same scout brief, Blender 5.2.2, two render threads and a
requested 15-minute generation budget per condition. Each agent preserved its
initial output and could repair its own visible failures within that budget.
The standalone Codex harness could not initialize in its read-only home; a
fresh writable home lacked authentication. The new pair uses independent
native-agent invocations with the same inherited configuration, not a pinned
CLI model identifier or a reproduction of the earlier Astra benchmark.

Both conditions had the same reference tools, but initially only the baseline
successfully opened an anatomy image. That research-only image was shared with
both for final self-review; the initial access difference remains a limitation.
There is one fresh generation per condition. Common-camera native and freshly
imported GLB review is qualitative, and must not be called a general capability
gain or averaged with the historical judging votes.

A separate strict local comparison preserves the final baseline generator,
scene, rig, poses, materials and framing, substituting only the hand-construction
block with the helper at a matched hand envelope. Its source diff and hashes
are retained with the evidence. This isolates a local construction substitution;
it does not establish whole-character, shoulder or across-prompt improvement.

### Follow-up observations

The strict hand substitution replaces a blade-like pointed thumb with a rounded
volumetric tip and gives somewhat clearer finger webs. It preserves all 26
non-hand objects, rig, sampled poses, lighting and cameras exactly. Both original
and revised hands were already connected; this is a form improvement, not a
connectivity repair. The helper increases each hand cage from 126 to 200 vertices.
The gain survives fresh import in frames 1, 20 and 40. The original wrist overlap
lip remains conspicuous and is not counted as fixed. Neither hand has articulated
finger bones, so these images do not establish grip quality.

The preserved source SHA-256 is
`3fe15c77dcf2fb241167540fd382d3a4c1214e63b4d84eccacc4ef39db956dd2`;
the hand-only replacement source is
`93475201459da1c8374d96487af9bbca070eaa7bedb40fbce9668e2c3f8a4ada`.
Both were rendered with identical original cameras and presentation, Cycles CPU,
16 samples, two threads and 512-pixel views. The 48 native/imported images include
palm/dorsal/edge and full-body views in all three poses. The maximum sampled
native/imported hand bounding-box difference is below 0.000001 m; this is not
an anatomy metric.

The separate fresh candidate joins the forearm and palm into one surface, avoiding
the overlap lip, but retains a mild wrist crease and simplified palm. Its small
unequal-loop construction is now available as `bridge_wrist_loops`, with an actual
hand-to-forearm topology regression. The helper returns the same face list as the
candidate's original loop algorithm; it does not guess anatomical alignment.

Common-camera independent scout review finds both neutral shoulder constructions
continuous already. The new candidate removes the baseline's conspicuous native
raised-underarm notch, but has a flat, broad shirt/shoulder mass and an abrupt
neck junction. The sampled arm angles differ. More importantly, fresh GLB import
of the frozen candidate restores a smaller angular underarm ledge absent in its
native render. That export defect is retained as a failure, rather than hidden
by the better native picture. These independent examples are illustrative, not
strict attribution to the helpers or proof of finished character quality.


### Portable shoulder repair

A separate repair after the frozen generation budget finalizes subdivision in
rest space before assigning skin weights, then replaces the discontinuous
lower-torso cutoff with a smooth local arm-region mask. The order-only first
trial exposed a sharp fold and is retained as failed evidence. The second trial
preserves the scene, proportions, materials, rig and poses while removing the
sharp underarm fold in both native and fresh GLB images. It still has a simplified,
broad shoulder mass and an abrupt neck junction; this is not realistic anatomy.
The guidance now explicitly addresses both evaluation order and continuous
region membership. The editable original cage/source is retained separately.

The repaired native/export point sets were compared bidirectionally at frames
1, 20 and 40. The largest nearest-vertex distance was 0.00000777 m at frame 20;
the other sampled maxima were below 0.00000060 m. These figures establish close
sampled surface correspondence, not collision freedom or anatomical quality.
The same raised-shoulder and hand-bend images are still required for acceptance.
This repair is additional to, not silently included in, the 15-minute comparison.

### Follow-up technical checks

Eight new Blender-Python construction regressions pass, including connected
hand/torso topology, mirrored winding, five digit caps, unequal wrist-loop
joining and strict parameter validation. They are also invoked by two live Bun
tests. The 17 Rust tests pass; repository validation, 44 documentation tests
(with one platform-specific skip) and the documentation build pass.

The final local Bun suite reports 96 passes and one failure: the unchanged
reference-comparison integration test exceeds its internal ten-second Eevee
render budget on this software-rendered cloud machine. Running the same
comparison directly succeeds with a longer diagnostic budget (about 43 seconds).
Its timeout and assertions were not relaxed, and the full suite is not reported
as green. An earlier concurrent run also hit the MCP client's 60-second evidence
render timeout; that test passes in isolation and in the final suite. No
performance improvement is claimed from these runs.

## Expanded failure search (October 20 follow-up)

This pass freezes `fdcab9688cc856deba5e58d37a1fd11919132e22` as its starting
point. It is **not** another run of the historical pinned CLI benchmark. Two
native-agent invocations authored (a) slender and stocky full-body stress
fixtures sharing one generator and (b) a separate cartoon outfit/walk. The
fixtures are not two independent generation replicates or finished scout and
mechanic passes. Each retains initial failures, repair attempts, scripts,
models, matching views and fresh GLB imports outside Git. Blender 5.2.2 LTS,
CPU rendering and two render threads were used. Concurrent diagnostic work
means no timings establish performance improvements.

### Construction stress matrices

The old closed-manifold tests missed self-overlapping surfaces. The expanded
checks use Blender BVH on evaluated polygons, exclude every pair sharing a
vertex, and count nonadjacent surface contacts/intersections. They do not
measure penetration depth, test all possible positive multipliers, or prove
anatomy, clearance during motion, or collision freedom between samples.

- **Hands:** ten finger-length multipliers from 0.1 to 2.0 at subdivision 0/1/2
  produce 22 failing conditions out of 30 before the repair, including the
  default unsubdivided cage. The first finger ring can sit behind a staggered
  root corner; thumb sections can cut back through the palm. Moving finger
  sections beyond their own root corners and shifting all thumb sections
  together outside the palm removes those contacts in the sampled matrix.
  The regression also tests mirrored hands: all 60 candidate conditions pass.
  An earlier trial thinned short thumbs too much and is retained as a rejected
  visual repair; the accepted repair preserves their girth.
- **Upper body:** width/depth 0.7/1.0/1.5, arm drop 15/40/65 degrees and
  subdivision 0/1/2 produce 21 failures out of 81 before the repair and zero
  afterward. In steep poses the first arm section folds behind the torso
  opening. The construction now reserves local clearance at that opening.
  Arm sections also use evenly distributed samples instead of inheriting the
  rectangular opening's two approximately 110-degree gaps. This corrects a
  flattened cross-section. An initial substitution also thickened the wrist
  and worsened its taper into an unchanged hand. That failed join is retained;
  the final endpoint radius restores approximately the prior wrist envelope
  while retaining regularized arm loops. Existing joins still need pose review.
- **Wrist bridge:** a separate 324-case circular-loop sweep (3–20 vertices on
  each boundary) found no nonadjacent intersections, degenerate faces or
  nonmanifold interior edges. No bridge algorithm change was needed. This
  does not validate arbitrary nonconvex or incorrectly ordered loops.

Matching underarm close-ups confirm removal of the intersecting fold, but an
angular crease remains. Matching hand views show the thumb no longer cutting
across the palm; it remains simplified. Dark palm and cropped oblique diagnostic
images are preserved but are not used as complete three-condition evidence.
The acceptance evidence uses complete dorsal and corrected lit-palm framing.

### Region masks: positive and negative controls

The two full-body fixtures test neutral, 90/120-degree elbow bend, arm raise,
and forearm twist in native and imported animation. Initially, the arm mask
pulls 46/96 slender and 44/96 stocky lower-waist vertices more than 1 mm during
an arm-only raise; maxima are 212.38 and 156.87 mm. Their original exported
surfaces closely match those bad native deformations. Export parity alone
therefore cannot pass this test.

A coordinate-band repair fixes the waist but incorrectly leaves 132/1698 and
126/1698 hand-region vertices with over 10% spine influence, visibly stretching
hands into spikes. That failed attempt is retained. The accepted targeted
repair carries semantic arm/hand membership through rest subdivision, reads
the interpolated mask before deleting construction groups, and only then
assigns bone weights. Both fixtures have zero sampled waist drift and zero
hand spine influence afterward. These are specific binding invariants, not
whole-character approval. The guide now requires both controls rather than
assuming a smooth coordinate formula establishes correct ownership.

A separate helper substitution rounds the outer elbow section in matching
close-ups, but the inner bend still pinches. The authored finishing iterations
add coherent trousers, shoes and facial features; these larger edits are not
attributed to the two helper fixes. Simplified anatomy and broad shoulder/neck
transitions remain visible. Sampled one-way nearest-point native/export
measurements are not reported as bidirectional surface equality.

### Cartoon motion failures

The separate cartoon run exposed an orientation error invisible to topology
checks: aiming bones with a fixed track/up quaternion discarded their rest
roll, flipping footwear. Across 49 sampled frames, the lowest sole remained
137–155 mm above a fixed world floor in native and fresh GLB. Preserving the
full rest frame removes that error. Subsequent tests separately exposed stance
sliding, sock penetration and jagged face-selected garment boundaries; a
fixed floor and garment review are necessary even when skin/export checks pass.
The guide now distinguishes sole height, horizontal stance motion, garment
clearance and complete bone-frame preservation. Later repair results and
remaining limitations are recorded with the retained evidence, not silently
included in the original generation.

The later cartoon repairs preserve rest-frame roll, use a deliberate sole
pivot for stance, replace jagged garment boundaries with coherent loops, and
separate a local ankle-clearance adjustment from rebinding. Recomputing the
weight field at newly displaced sock vertices initially made deformation worse;
that failed larger-gap trial remains retained. Preserving the pre-offset
binding coordinates during the final local 6 mm clearance reduces sampled
sock/body signed-distance events over 1 mm to zero in native and imported
49-frame checks. Residual signed overlap is about 0.84 mm, and the lifted
sock-to-shoe silhouette remains visibly scalloped. This is not collision-free
or a fully accepted outfit. Sole-pivot diagnostics show negligible sampled
stance-axis drift, not a proof of between-frame or complete no-slip contact.
The torso weight shift, garment seam fit and facial/anatomical finish still
need work. No run in this pass establishes production-ready characters.

### Final follow-up validation

- Twelve live Blender construction regressions pass (six hand, six upper
  body), including the 60/81-condition matrices and preserved wrist envelope.
  The two Bun wrappers pass against the final scripts.
- Full local Bun suite: 96 passes, one failure. The unchanged MCP reference
  comparison still exceeds its internal ten-second Eevee render budget on
  this software-rendered cloud host. Its timeout and assertions are unchanged;
  the full suite is not reported as green.
- Standalone Python discovery: 26 pass, 12 bpy-only cases skipped there and
  executed separately inside Blender as above. Rust: 17 pass. Repository
  validation, documentation tests (44 pass, one platform skip) and build pass.
- Initial setup attempts mixed the installed Blender 4.3.2 with 5.2.2 or hit
  process/resource limits during concurrent rendering. Those partial attempts
  are retained, not counted as final passes. The final checks consistently use
  official Blender 5.2.2; software-render threads are bounded and a writable
  shader cache is supplied where supported. No performance claim follows.
- The initial in-memory gallery fetch was killed; bounded-memory streaming
  extraction verified the same pinned archive hash, every image
  hash and the manifest counts before docs validation. No gallery data changed.

The final wrist-envelope adjustment was also inspected in eight native/imported
views (palm/edge, elbow bend/overhead) on one slender fixture using the unchanged
old hand to isolate the upper-body change. Its join remains continuous without
the earlier thick-wrist bulge. Cropped distal fingertips and a partly occluded
opposite hand limit those views to the wrist; they do not validate finger form.
