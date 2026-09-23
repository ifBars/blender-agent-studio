# Improving request fidelity and domain quality

Quality means fulfilling the user's intended result, with evidence appropriate
to the domain. A valid file, an armature, a fluid modifier or a high silhouette
score is not sufficient. This development pass adds workflow and measurement
coverage; it does not establish a measured capability gain across models.

## Request fidelity

The intake workflow asks one to three focused questions when different plausible
interpretations change identity, style, motion, simulation type or delivery.
It proceeds on routine defaults and preserves decisions already supplied by
the user. Necessary answers remain pending while independent inspection proceeds.
Static characters do not acquire an unrequested rig. A render-only simulation
does not acquire an irrelevant animation-export requirement.

Use the eight [intake cases](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/intake-cases.json)
as an interactive evaluation lane, separate from noninteractive geometry runs.
Present only each prompt and its context, with actual attachments or a prepared
scene where specified; do not pretend an unavailable attachment was inspected.
Keep expected behavior and scripted answers hidden until needed. Supply the
same answer after the first response in both conditions. Mark an unavailable
context fixture as not tested, not a pass.

For each case record: necessary choice surfaced, unnecessary questions,
assumptions stated, independent work continued, dependent work deferred, prior
decisions preserved, and answer followed. Score pass/fail/unclear with a transcript
excerpt for each applicable dimension. Do not keyword-match the wording of a
question or reward simply asking more questions. Use the conflicting-reference
case as a holdout. These are review fixtures, not an automated conversational
simulator or completed benchmark results.

## Capability suites

The historical `full`, `challenge` and `gauntlet` task sets remain unchanged.

| Suite/task | Main question | Independent technical evidence | Visual evidence still needed |
| --- | --- | --- | --- |
| quality / character_form_quality | Does the requested static creature have coherent form and fitted clothing? | Native/export inspection | Species, proportions, anatomy, clothing fit, reverse views |
| quality / walk_cycle_quality | Does a skinned character walk with convincing contacts? | Evaluated deformation in native and fresh GLB samples | Weight, foot slide, joint collapse, full-loop playback |
| quality / facial_expression_quality | Do expressions and combinations preserve facial form? | Shape keys and native/export geometry changes | Eyelid/lip collisions, expression readability, volume |
| quality / liquid_pour_quality | Does genuine liquid flow, impact and remain contained? | Liquid domain, data/mesh bake metadata, cache presence and sampled surface changes | Flow continuity, leaks, surface quality, stability |
| quality / cloth_drape_quality | Does cloth collide, drape and settle? | Cloth bake metadata and sampled deformation | Penetration, folds, stretch, jitter, support |
| reference / reference_reconstruction_quality | Does the full 3D asset match both supplied images? | Hashed shared images, native/export inspection | Identity, proportions, openings, depth, material regions |

From the repository root, for a focused run:

```powershell
bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_benchmark.ts --suite quality --tasks liquid_pour_quality --mode skills --profile astra --repetitions 3 --output .tmp/liquid-candidate
```

Use a separate output directory and condition label for every pinned revision.
For `--suite reference`, also pass `--reference-dir <directory>`. It must contain
`reference-front.png` and `reference-side.png`: reviewed PNG images of the same
smooth manufactured prop in a consistent pose, each at most 32 MiB. Keep license,
provenance and subject identity in a local pack manifest. Use a prop with at
least two distinct material regions, visible openings/connections and adequate
view coverage. The fixture assumes one-meter overall height. Freeze the pack
before either condition; repeat with held-out subjects before making broad claims.
No proprietary input pack or generated artifact is committed.

The runner copies and hashes inputs before generation and supplies them again
for clean source reproduction. Blinded judges receive the original front/side
images with the fixed multiview evidence. It does not trust agent-authored
overlays as independent measurements or infer a mask from photo brightness.

## What the measurements establish

Scorer 5 preserves historical point weights and adds zero-point hard gates to
the new motion tasks. `inspect_motion.py` opens the authored asset or a fresh
GLB, samples explicit frames and exact mesh targets, and reports finite geometry,
local vertex-position hashes and evaluated transforms. An unrelated object with
keys, an empty domain or rigid root movement cannot satisfy a deformation gate.
Local geometry changes do not prove useful deformation: vertex reordering,
tiny movements or poor deformation can still change the digest. Blinded review
remains essential.

Liquid gates require a liquid domain, enabled viewport modifier, Modular or
Final cache (`MODULAR` / `ALL` in Blender's Python enum), baked data and mesh,
declared frame coverage and nonempty cache files. Cloth gates require a baked
point cache covering the samples. These are prerequisites, not mass conservation,
cache completeness or collision proofs. The inspector never bakes. It samples
2-12 frames, 1-8 named meshes, up to 2 million evaluated vertices per sample,
and traverses at most 10,000 cache entries. Geometry limits apply after modifier
evaluation and therefore do not cap evaluation memory.

Simulation tasks deliberately export a static mesh snapshot. Their video and
native/cache evidence are mandatory; they do not need a fictitious GLB action.
Character actions require observed deformation again after GLB import. Video
duration/fps/frame count are file checks only. The automated image judge sees
sampled stills, so continuous timing, flicker, foot sliding between samples and
loop smoothness remain `unclear` pending blinded full-video review. Do not turn
a metadata pass or a filmstrip into a claim that playback was reviewed.

New manifests fingerprint the exact Blender version/build output, task content,
evaluator source, reference inputs, time budget and permission mode. Strict
comparisons reject missing or mismatched controls before spending on judges.
Older runs lacking these controls remain historical evidence, not eligible
strict comparison partners. Rescoring cannot reconstruct missing motion samples
or provenance. Keep scorer and inspector revisions explicit and retain raw data.

## How SceneIR and image-to-3D contribute

SceneIR now accepts an explicit `frame` for scene description, quality checks
and paired repairs. Contact anchors and bounds can therefore be checked in the
pose that failed, without resaving the asset. Paired repairs reject differing
saved frames unless a common frame is supplied, and reject differing unit scales.
Checks still measure authored anchors and evaluated bounds; they do not infer
bone-surface attachment or physical contact. Simulations require an existing
cache; setting a frame is not a bake.

The [image-to-3D workflow](../plugins/blender-agent-studio/skills/blender-modeling-workflow/references/image-to-3d.md)
records binding visible features and uncertain hidden structure, separates
camera fitting from shape repair, freezes comparison inputs, and checks an
independent view before accepting changes. This reduces the incentive to distort
the model to fit one projection.

## Measured snapshot

The [September 2026 paired campaign](quality-campaign-2026-09-23.md) found a
character visual win and a liquid visual regression, with higher time/token use
in both revised runs. A reproduction-directory collision invalidated the liquid
technical-score delta and led to an isolation repair. These mixed results do not
establish an overall quality gain.

## Next evidence to collect

Run old/revised workflows on the same explicit model, effort and controls, with
at least three repetitions and a held-out subject. Review per-task gates and
criterion outcomes; do not average a character regression away with a prop win.
Report time, tokens, failures and variance alongside quality. Integration tests
validate the tools and known good/bad fixtures, not generated-art quality.

Prioritize further engineering from observed failures: pose-aware surface
anchors for skinning, cache-file/frame provenance, continuous contact/trajectory
measurements, and licensed multi-view packs with calibrated cameras and reviewed
masks. Those are follow-on capabilities, not implemented physical or semantic
guarantees of SceneIR today.
