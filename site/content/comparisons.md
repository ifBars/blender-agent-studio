---
title: No plugin vs with plugin
description: Same model and task. Compare vanilla results with Blender Agent Studio.
---

## What you are comparing

**No plugin** receives the modeling brief with plugin discovery, skills and MCP
disabled. **With plugin** receives the same brief plus Blender Agent Studio's
pinned modeling and validation skills and bundled scripts. This tests the
plugin's skill workflow; it does not measure the additional effect of MCP.
Both conditions use the same model, medium effort, Blender build, evaluator and
12-minute generation budget.

This October 2, 2026 pilot covers GPT 6 Astra, GPT 6.1 Sol, Opus 5.5 and Sonnet
5.5. Each task has one generation per condition. The no-plugin baselines were
collected after the existing frozen plugin runs, so generation order was not
counterbalanced. Two fresh Astra judging sessions review each pair with
reversed A/B order. These are two judgments of the same assets, not independent
generation trials or a general model ranking. `Unclear` remains missing evidence.

The slider now compares actual no-plugin and plugin runs. The earlier
experiment comparing existing skills with added spatial guidance is a separate
study on the [results page](results.md). It is not used as the no-plugin baseline.
Review shape, finish and contacts alongside the technical checks; structural
scores alone do not establish visual quality.

## A whole-scene benchmark

The new **courier depot** suite asks for a complete low-poly game environment:
21 asset families, 45 instances, a 20 × 16 m site, coherent materials, usable
access routes and credible placement. It checks every instance and generates
individual perspective, front and rear views, both isolated and in context,
alongside the scene overview.

The systematic condition uses an asset ledger and small production batches:
validate individual assets, place them, then recheck the whole scene. Technical
checks cover budgets, ownership, transforms, orientation, sampled supports and
fresh export. Every instance gets its own critical quality-and-placement
verdict, so a good
building cannot hide a weak bench or background prop.

This suite is implemented and its detection paths are tested; it is **not a
completed model benchmark** in the gallery above. Support sampling does not
certify collision-free navigation, and no target-engine performance is claimed.
See the [whole-scene protocol](https://github.com/ifBars/blender-agent-studio/blob/main/docs/whole-scene-benchmark.md)
and [spatial pilot protocol](https://github.com/ifBars/blender-agent-studio/blob/main/docs/spatial-benchmarks.md)
for the contracts and limitations.
