---
title: Results
description: What paired tests show about the plugin, and what they don't.
---

Paired experiments hold prompts, Blender builds, model settings and evaluators
fixed. Each pair is one generation per condition, so read these as directional
evidence rather than a success rate.

## No plugin vs with plugin: October 2, 2026

The [interactive comparisons](comparisons.md) cover eight matched pairs: two
tasks across GPT 6 Astra, GPT 6.1 Sol, Opus 5.5 and Sonnet 5.5. Eight fresh
no-plugin baselines are paired with eight existing frozen plugin-skill runs,
using the same task briefs, models, effort, budget, Blender build and evaluator.

Both reviews preferred the plugin in all eight pairs. Technical gates passed in 4/8 no-plugin submissions and 7/8 plugin submissions after the naming correction. These are observed pilot outcomes, not general success rates. Sonnet's lamp is a technical regression: its no-plugin run passed, while its plugin run failed geometry checks.

The no-plugin runs were collected later, so generation order is not
counterbalanced. Oversized staging obscures some baseline assets; preference
includes presentation and delivery quality as well as modeling. This tests the
plugin's skills and scripts, not MCP's additional effect. See the
[full comparison report](https://github.com/ifBars/blender-agent-studio/blob/main/docs/plugin-comparison-2026-10-02.md)
for per-pair outcomes and failed checks.

## Added-guidance pilot: October 2, 2026

The separate added-guidance experiment covers **16 generations** across
GPT 6 Astra, GPT 6.1 Sol, Opus 5.5 and Sonnet 5.5: a joinery stool and an
articulated lamp, each with the current skills and with added spatial checks.
Both conditions have the same tools and 12-minute generation budget.

Two counterbalanced Astra reviews preferred the current workflow unanimously
in six pairs, the added checks in Sonnet's lamp pair, and split on Sonnet's
stool. The extra guidance remains experimental. Fourteen submissions pass the
technical gates after correcting a hardware-name false negative; the remaining
failures are a timeout and invalid geometry. Structural validity does not
settle visual quality or ambiguous contacts.

This comparison measures added guidance on top of existing skills. It is
separate from the older **without-plugin / with-plugin** samples below. The
[full pilot report](https://github.com/ifBars/blender-agent-studio/blob/main/docs/spatial-campaign-2026-10-02.md)
preserves the correction, limitations and per-pair outcomes.

## Earlier paired samples

In five fresh pairs, the plugin's workflow passed the technical gate every time and the agent without it failed every time. Three blinded judges preferred the plugin's asset in four of the five pairs.

Scores and build times read baseline / plugin. The lanterns were generated with GPT-6 Sol; the press and drawbridge with GPT-6 Astra.

| Task | Technical score | Judges preferred | Build time |
| --- | --- | --- | --- |
| Signal lantern | 96 fail / 100 pass | Plugin, 3–0 | 4.04 / 4.99 min |
| Lantern, repeat 1 | 89.83 fail / 100 pass | Plugin, 3–0 | 6.52 / 4.92 min |
| Lantern, repeat 2 | 96 fail / 100 pass | Baseline, 3–0 | 5.60 / 6.60 min |
| Tabletop lever press | 94 fail / 100 pass | Plugin, 3–0 | 5.05 / 11.82 min |
| Winch drawbridge | 90 fail / 100 pass | Plugin, 3–0 | 5.34 / 11.41 min |

Every baseline failed the geometry check, with invalid elements such as degenerate faces or zero-length edges. Three also exported a 200-meter studio floor with an asset limited to a few meters. The plugin used more tokens in every pair. Lantern build times were about even; the press and drawbridge took about twice as long.

## Claude Code samples

Those pairs ran in Codex. We also ran the lantern task once each with Claude Sonnet 5.5 and Claude Opus 5.5 in Claude Code, using the plugin's skills and no baseline.

| Generator | Technical score | Build time | Tool calls (failed) |
| --- | --- | --- | --- |
| Claude Sonnet 5.5 | 95.83 fail | 5.6 min | 27 (0) |
| Claude Opus 5.5 | 100 pass | 6.9 min | 26 (0) |

Both lanterns showed every required part. Sonnet failed only the automated part-naming check, because no object was named body, housing, or frame. These are single generations with no judges and no baseline, so they don't show a benefit over working without the plugin or rank the models. The [full evidence](https://github.com/ifBars/blender-agent-studio/blob/main/docs/plugin-quality-evidence.md#claude-code-samples) has the controls.

## What this doesn't show

- **A general success rate.** Five pairs can't predict results for arbitrary prompts, models, or art styles.
- **Independent votes.** Three judges on one pair are three opinions about the same two assets.
- **What the MCP tools add.** These runs used the skills without the MCP tools.
- **A Claude Code baseline for the earlier study.** Its paired samples ran in Codex; its two Claude runs were single generations. The separate spatial pilot above includes paired Claude workflows.
- **Consistent visual gains.** In lantern repeat 2, every judge preferred the baseline's appearance, even though its geometry failed the technical gate.

Plugin revisions have also shown [both gains and regressions](https://github.com/ifBars/blender-agent-studio/blob/main/docs/quality-development.md). Review results yourself, particularly shape, materials, animation, and exports.

## Details

The [full evidence](https://github.com/ifBars/blender-agent-studio/blob/main/docs/plugin-quality-evidence.md) lists every defect, the controls, and how the oversized floors were handled for visual judging. The [benchmark methodology](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md) defines the conditions and the visual rubric.


## Whole-scene benchmark

Two additional opt-in suites expand coverage: `scenes` contains a decorated
reading room, an exportable low-poly night market and a coastal-cafe holdout;
`game_characters` contains a static ranger, a rigged scout with deformation
poses and a nonhuman badger-merchant holdout. Scene evidence keeps authored
cameras and lighting, and render-only interiors do not require a GLB. These are
available fixtures. The gallery now adds ten completed scene pairs: reading
rooms and night markets across all four current models, and coastal cafés from
Astra and Sol. Eight pairs have valid counterbalanced reviews; two market pairs
are unreviewed. The Claude cafés and game-character runs did not produce complete
paired evaluator results and are excluded from the completed comparison count.
The [October 4 publication report](https://github.com/ifBars/blender-agent-studio/blob/main/docs/scene-comparison-2026-10-04.md)
records every added row, resource limits, scoring corrections and missing evidence.
See the [scene and character protocol](https://github.com/ifBars/blender-agent-studio/blob/main/docs/scene-character-benchmarks.md).

The courier depot benchmark asks for 21 asset families and 45 instances.
It checks each asset's construction and placement, then the assembled scene.
The suite is implemented and calibrated; model runs are still pending.
Read the [whole-scene protocol](https://github.com/ifBars/blender-agent-studio/blob/main/docs/whole-scene-benchmark.md).

## Gallery previews

The gallery covers five tasks with GPT 6 Astra, GPT 6.1 Sol, Opus 5.5, and
Sonnet 5.5. Each entry compares no plugin with the pinned plugin workflow.
Original dates, scores, and study conditions remain attached to each pair.

The older GPT 6 Sol lantern is a separate historical example. The gallery owner
selected run 3 after viewing all three attempts; all three reviewers preferred
its no-plugin result. The other attempts remain in the
[archived gallery](https://github.com/ifBars/blender-agent-studio/releases/tag/gallery-hd-2026-10-02).
This selection is not an average or a random sample.

HD previews are new 1536-pixel Cycles renders with 64 samples and
OpenImageDenoise. Saved studio floors and backdrops are hidden where needed to
frame the asset; their names appear under **Scores & review**. The saved models
and technical results are unchanged. Choose **Review images** for the images
used by the judges. Their votes describe those images, not the new previews.

For the matrix expansion, review views exclude the listed studio meshes too.
This prevents oversized floors from hiding the modeled asset. Original
submission views are linked inside **Scores & review**, and their technical
failures remain recorded.

The [matrix protocol](https://github.com/ifBars/blender-agent-studio/blob/main/docs/gallery-matrix.md)
lists the generation controls and selection policy.
