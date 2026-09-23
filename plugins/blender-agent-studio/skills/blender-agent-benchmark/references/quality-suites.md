# Quality and reference suite protocol

`--suite quality` contains five independent tasks: static otter form/clothing,
skinned walk cycle, facial expressions, liquid pour and cloth drape. Select a
small slice with `--tasks` before launching a campaign. `--suite reference`
contains a two-view reconstruction task and requires `--reference-dir` with
`reference-front.png` and `reference-side.png`. Use reviewed views of the same
smooth manufactured prop with at least two material regions, openings or
attachments; the fixture sets a one-meter overall height. Each PNG is limited
to 32 MiB. Freeze licensed inputs and use identical hashes across conditions.
The runner stages images and gives the original views to blinded judges.

Required motion samples come from fresh Blender evaluation of named targets.
Native and imported character meshes must actually deform; a moving root or
unused action is insufficient. Liquid needs a liquid domain, data/mesh bake
flags, bounded nonempty cache-file evidence and a changing evaluated surface.
Cloth needs a baked point cache and deformation. Bake metadata and geometry
changes are necessary signals, not proof of physical plausibility or useful
motion. GLB delivery for simulation tasks is explicitly a static snapshot.

Videos have duration/fps/frame-count gates. The automated blinded judge sees
stills only. Mark continuous timing, loop smoothness, flicker and between-frame
contact unclear until actual blinded playback review. Preserve those missing
judgments instead of inventing passes. Report domain-specific criteria alongside
technical scores; one task or repetition cannot establish broad improvement.

Strict paired comparisons require equal Blender build, task/evaluator/input
fingerprints, time limits, permissions, model, effort and evidence settings.
Historical runs without the new controls are ineligible for strict comparisons.
Do not backfill absent provenance from the current installation. Rescoring old
metrics cannot manufacture missing motion or reference evidence.

The [intake cases](intake-cases.json) are a separate interactive review lane.
Present only prompt/context and actual required attachments to each condition,
then use the same scripted answer. Keep the expected behavior hidden. Record
pass/fail/unclear for necessary questions, unnecessary questions, assumptions,
independent progress, waiting on necessary answers, preserving prior choices and
following the reply. Supply missing fixture assets or mark the case not tested.
Score intent, not literal wording. The asset-generation runner is not a
conversation simulator and its no-question fixtures cannot test intake behavior.
