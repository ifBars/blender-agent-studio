---
title: Results
description: What paired tests show about the plugin, and what they don't.
---

We compare the same agent with and without the plugin's skills, holding the prompt, Blender build, model, time limit, and evaluators fixed. Each pair is one generation per condition, so read these as directional evidence rather than a success rate.

## Current paired samples

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
- **Claude Code performance.** The paired samples ran in Codex; the two Claude runs are single generations.
- **Consistent visual gains.** In lantern repeat 2, every judge preferred the baseline's appearance, even though its geometry failed the technical gate.

Plugin revisions have also shown [both gains and regressions](https://github.com/ifBars/blender-agent-studio/blob/main/docs/quality-development.md). Review results yourself, particularly shape, materials, animation, and exports.

## Details

The [full evidence](https://github.com/ifBars/blender-agent-studio/blob/main/docs/plugin-quality-evidence.md) lists every defect, the controls, and how the oversized floors were handled for visual judging. The [benchmark methodology](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md) defines the conditions and the visual rubric.
