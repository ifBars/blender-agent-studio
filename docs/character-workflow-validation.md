# Character workflow validation

This is draft work. The first paired generation improves several visible
problems, but shoulders, hands and body proportions still need adjustment.
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
- Treat centroid distances as selected constraints: they do not establish
  collision freedom, orientation, continuous seam contact or unsampled motion.

Raw models, renders, generation traces and comparison manifests stay outside
Git. The draft PR carries representative screenshots.
