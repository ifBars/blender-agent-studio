---
title: Compare modeling workflows
description: Same task. Same model. Two workflows. Inspect the difference.
---

## What you are comparing

The **current workflow** uses the plugin's existing modeling and validation
skills. **Added spatial checks** uses those same skills plus an explicit
contact map, SceneIR checks, close-up inspection and a recorded repair loop.
Both have the same tools and a 12-minute generation budget at medium effort.

This October 2, 2026 pilot covers GPT 6 Astra, GPT 6.1 Sol, Opus 5.5 and Sonnet
5.5. Each task has one generation per condition. Two fresh Astra judging
sessions review each pair with reversed A/B order. Those are two judgments of
the same assets, not two independent generation trials or a general model
ranking. `Unclear` remains missing evidence.

The added guidance is experimental. It has not earned a place in the default
workflow. Review the construction, finish and evidence yourself; more checking
does not automatically produce a better model. The [results page](results.md)
keeps earlier experiments separate from this pilot.

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
