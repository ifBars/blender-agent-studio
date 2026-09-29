---
title: Scene analysis
description: Query hierarchy and dimensions, check explicit constraints, and diff a repair against its baseline.
---

Three tools extract an evaluated snapshot of the scene, called SceneIR, and analyze it with a small Rust runtime:

```text
.blend or export
  → Blender extraction → SceneIR
  → bas-runtime → description and quality report

baseline + candidate SceneIR
  → bas-runtime → structural diff and declared gates
```

They make hierarchy, dimensions, topology, and explicit constraints queryable. They don't measure aesthetic quality.

> [!NOTE]
> Build the runtime once with `bun run setup:runtime` in the installed plugin directory. See [Installation](install.md#scene-analysis-runtime).

## Describe, then focus

Start with `blender_describe_scene` and an `assetPath`. It returns object IDs, authored roles, mesh counts, evaluated world-space bounds, the hierarchy, and bounded spatial candidates. Then focus on one assembly:

```json
{
  "assetPath": "/assets/deer.blend",
  "frame": 24,
  "objectId": "deer",
  "includeDescendants": true,
  "limit": 40
}
```

- IDs are exact Blender object names. Roles come only from an authored `bas_role` custom property, never from names.
- `frame` evaluates a pose without saving the file. It doesn't bake simulations.
- Results are paginated, but bounds and constraints always cover the whole selection.

## Check explicit constraints

`blender_quality_report` checks only the constraints you ground in the brief:

```json
{
  "assetPath": "/assets/deer.blend",
  "objectId": "deer",
  "triangleBudget": 2500,
  "groundZ": 0,
  "groundObjects": ["front_left_hoof", "front_right_hoof"],
  "requireClosedMesh": false
}
```

Use `contactPairs` for parts that must touch and `connectionPoints` for joints such as pivots and cable ends. Triangle budgets, required closed meshes, and definite contact gaps fail. Open edges, disconnected parts, and overlapping bounds are findings to review.

A `review_required` status is **not a pass**. The report's visual questions still need an answer.

## Compare a repair

After regenerating a repair, `blender_compare_scenes` diffs the preserved baseline and the candidate. It reports added, removed, and changed objects, triangle and bounds deltas, and per-object transform and hierarchy changes. Matching uses exact IDs, so keep object names stable.

The diff states facts, not a verdict. Failures come only from options you declare, such as `requiredObjects`, `forbidRemovedObjects`, `maxTriangleIncrease`, or `invariantObjects` for parts the repair should leave alone.

## Limits

- Overlapping bounds are a candidate, not a proven intersection. Parenting doesn't prove a physical connection.
- Only meshes get geometry summaries. Instances are reported as omitted until realized.
- Symmetry, support, and semantic correctness aren't inferred.

The [SceneIR guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/scene-understanding.md) covers the schema, every option, and size limits.
