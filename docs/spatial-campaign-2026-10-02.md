# Spatial modeling pilot — October 2, 2026

> This archived study compares existing plugin skills with added guidance.
> The live gallery now compares genuine no-plugin baselines against plugin
> runs; see [the no-plugin comparison report](plugin-comparison-2026-10-02.md).


The campaign ran **16 generations: two tasks × four models × two workflows**.
The added spatial-check guidance did not produce a general improvement in this
sample. Six pairs unanimously favored the current workflow, Sonnet's lamp
favored the added checks, and Sonnet's stool split the two judgments. Keep the
guidance experimental rather than making it the default.

## Controls and evidence

- Codex 0.160.0: `gpt-6-astra`, `gpt-6.1-sol`.
- Claude Code 2.1.287: `claude-opus-5-5`, `claude-sonnet-5-5`.
- Blender 5.2.2 LTS, one frozen plugin snapshot, medium effort, 12-minute
  generation limit, one generation per condition, at most two cells together.
- Both conditions received the same task and skill scripts. The added condition
  also received frozen contact-map, SceneIR, close-view and repair-record
  guidance. This is a bundled guidance experiment, not an MCP ablation.
- Each saved asset received independent metrics, fresh GLB inspection, clean
  source reproduction and the same seven-view neutral evidence preset.
- Two fresh GPT 6 Astra visual reviews per pair used reversed anonymous A/B
  order. They are judgments of the same assets, not independent generations.
- All recorded source, Blender and GLB artifact hashes still match. All four
  requested model IDs passed CLI preflight; Claude traces also record the
  requested generator identities. Codex invocations pin their model IDs.

The campaign ran from 22:06:57 to 23:08:20 UTC. Concurrent wall times are context,
not a model latency benchmark. One generation hit the limit; the other 15
agents completed. Both native and exported artifacts were still evaluated for
the timed-out generation, and its timeout remains a hard failure.

## Paired results

Values are **current / added checks**. Structural scores are proxies, not
ratings of artistic quality or proof of contact.

| Task | Model | Structural score /100 | Technical gates | Visual preference votes |
| --- | --- | --- | --- | --- |
| Stool | GPT 6 Astra | 100 / 100 | pass / pass | 2 / 0 |
| Stool | GPT 6.1 Sol | 98.33 / 98.33 | pass / pass | 2 / 0 |
| Stool | Opus 5.5 | 100 / 96 | pass / pass | 2 / 0 |
| Stool | Sonnet 5.5 | 96 / 98.4 | pass / pass | 1 / 1 |
| Lamp | GPT 6 Astra | 100 / 100 | pass / pass | 2 / 0 |
| Lamp | GPT 6.1 Sol | 100 / 96 | pass / timeout | 2 / 0 |
| Lamp | Opus 5.5 | 100 / 100 | pass / pass | 2 / 0 |
| Lamp | Sonnet 5.5 | 96 / 96.31 | fail / pass | 0 / 2 |

The current Sonnet lamp has **two degenerate faces and 128 zero-length edges**;
these are not invalid vertex coordinates. Sol's added-checks lamp reached the
720-second generation limit. After the naming correction below, 14 of 16
submissions pass the technical gates. No failed row was excluded from the
visual comparison.

Across the five critical spatial criteria, the two reviews produced 78 pass /
0 fail / 2 unclear judgments for the current condition, and 70 pass / 0 fail /
10 unclear for added checks. These 80 judgments per condition are correlated
observations, not 80 independent trials. In particular, unclear is not a
verified collision or a pass.

## What the evidence suggests

1. **Evidence availability and evidence readability are different.** The added
   Astra lamp had a technically valid export, but neither judge could clearly
   distinguish its recessed bulb. One judge also left its upper joint and
   hinge clearance unresolved. Both judges found the added Sol and Opus lamps'
   hinge clearance unclear. Inspect the final joint at a readable scale;
   recording a check does not make the geometry visually legible.
2. **More checking can accompany simpler construction or poorer finish.** The
   current GPT stools were preferred for finish, including less repetitive
   wood treatment. The current Opus stool had more convincing softened edges
   and hardware. The stool contact criteria were already near a ceiling, so
   this fixture offers little evidence about reducing rare floating defects.
3. **The intervention can help individual cases.** Sonnet's added-checks lamp
   passed technical gates and won both visual reviews. Its hinge clearance was
   readable to one judge, versus neither judge for the current lamp. This is
   a useful case, not a universal gain or a cross-model ranking.
4. **The workflows do find repairable defects.** Generation traces include
   cable curves dipping through the desk, triangle-budget overshoot, collapsed
   bevel edges, broken-looking trim and arm-to-shade overlap. Both conditions
   sometimes found and repaired them. Agent-authored repair reports are useful
   process evidence, separate from the independent final verdicts.
5. **Tool discovery is part of the problem.** The current Sonnet stool reported
   that the renderer lacked a bottom view even though the pinned script
   supported it. The repository now documents the bottom and focused-view
   arguments directly in the validation skill. The running snapshot was not
   changed after dispatch.

## Correcting a scorer false negative

The frozen stool rubric recognized hardware, pin and bolt names but omitted
`Screw_*`. Both Sonnet stools therefore originally failed semantic coverage:
raw scores **89.75 / 92.15**. The current rubric also accepts screw, rivet and
fastener names. Rescoring the preserved metrics gives **96 / 98.4**, with both
technical gates passing. The remaining UV penalties are retained.

This is a naming-check correction, not a geometry repair. The gallery dataset
retains raw scores/gates, corrected scores, scorer versions, original artifact
hashes, task fingerprints and both raw visual reviews. Original run summaries
and artifacts remain unchanged.

## Implemented follow-through

- Added an optional underside view with diagnostic fill and a focused-camera
  option that preserves surrounding geometry. Partial/focused evidence stays
  explicitly separate from complete multiview evidence.
- Added the [whole-scene suite](whole-scene-benchmark.md): 21 families, 45
  instances, per-instance budgets and critical visual verdicts, placement and
  orientation constraints, evaluated support samples, export preservation and
  clean reproduction. Every instance gets isolated and contextual views.
- Added the docs comparison page with task/model/view selectors, draggable and
  keyboard-operable image comparison, technical checks and downloadable data.
- Kept experimental guidance opt-in. A next causal test should separate contact
  constraints, camera coverage and repair budgeting instead of attributing this
  bundled result to SceneIR or screenshots alone. Seeded defect-repair fixtures
  and multiple repetitions would reduce the current ceiling and sampling limits.

The whole-scene evaluator has passed fault fixtures and a complete 45-instance
calibration run. **The four models have not yet run the whole-scene benchmark.**
No target game engine or runtime performance has been validated.

## Local evidence and reproduction

Raw evidence is retained outside the repository at
`../benchmarks/spatial-2026-10-02/`: `runs/campaign.json`, per-run summaries and
traces, `runs/structural-report.json`, and `judging/*/comparison-summary.json`.
The source snapshot and guidance are frozen there. The
[spatial protocol](spatial-benchmarks.md#build-the-comparison-gallery) documents
how to rebuild the ignored local gallery assets before building the docs site.

The saved calibration log is `whole-scene-smoke.log`; calibration primitives
are test fixtures, not model-quality submissions. Generated renders and models
remain outside version control according to repository policy.
