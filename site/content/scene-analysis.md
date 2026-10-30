---
title: Scene analysis
description: Query hierarchy and dimensions, check explicit constraints, and diff a repair against its baseline.
---

Four tools extract evaluated scene or surface-anchor snapshots, called SceneIR, and analyze them with a small Rust runtime:

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

## Deforming character attachments

`blender_inspect_attachments` extends SceneIR inspection to explicit surface
patches across 2–12 poses. Object-local connection points track object transforms;
they do not track skin deformation. The new extractor evaluates fixed mesh
vertices and projects their weighted centroids into SceneIR `SURFACE_ANCHOR`
objects. The existing Rust connection analyzer then measures each declared pair.
These projections are inspection evidence, never objects added to the source.

Standardized evidence rendering also excludes meshes hidden by ancestor
collections or view-layer exclusion. This prevents invisible imported rig
helpers from enlarging the framing bounds or moving the diagnostic floor.
The correction is recorded as evidence settings version 3; compare both
conditions with the same renderer version.

```json
{
  "assetPath": "/work/character.blend",
  "outputJson": "/work/ankle-check.json",
  "frames": [1, 7, 13, 19, 25],
  "anchors": [
    { "id": "shin-front", "objectName": "Body", "vertexGroup": "check_shin_front" },
    { "id": "sock-front", "objectName": "Sock.L", "vertexGroup": "check_sock_front" }
  ],
  "connections": [
    { "name": "sock-front-fit", "anchorA": "shin-front", "anchorB": "sock-front", "maxDistance": 0.005 }
  ]
}
```

Each anchor selects either a named vertex group or explicit `vertexIndices`
in the original mesh, with at most 4096 vertices. Use small patches and several
pairs around a seam: one broad centroid can conceal rotation or local gaps.
Record the selectors after topology is stable. Nondeforming inspection groups
must stay outside skin-weight normalization and bone-influence audits.
Thresholds use scene world units; the report includes meters per unit. The
example's threshold is illustrative, not a universal ankle tolerance.

The tool saves source and binding hashes, selectors, projected SceneIR samples,
per-frame distances and correction vectors, and the worst frame for each pair.
Failed constraints return `constraints_failed`; otherwise the status remains
`review_required`. Distances do not prove good anatomy, lack of penetration,
contact orientation, or continuity between sampled frames.

Preserve the baseline and fix the reported weights, attachment ownership or
geometry. Repeat with the same patches, thresholds, poses and cameras. Inspect
neutral and worst-pose closeups, then check the fresh export separately. Export
topology and custom groups can differ, so verify selectors after import.
Topology-changing or unknown enabled modifiers are rejected. Use a stable
inspection copy and explicitly rebind; never silently reuse indices after
remeshing. Extraction uses viewport evaluation and does not bake simulations.
It samples the loaded scene's active action/NLA state; it does not select or
iterate animation clips. Save an inspection copy with the intended action
active and verify the corresponding action after export import.

On the repair run, set `baselineJson` to the preserved first output. The tool
recomputes its checks and rejects changed selectors, frames or tolerances.
Its comparison lists repaired and newly failing frames. Changed topology or
group membership yields `rebind_review_required`, not a claimed improvement.
Even `selected_constraints_improved` covers only the specified distance
constraints; retain a repair only after checking the same visual evidence.

## Limits

- Overlapping bounds are a candidate, not a proven intersection. Parenting doesn't prove a physical connection.
- Only meshes get geometry summaries. Instances are reported as omitted until realized.
- Symmetry, support, and semantic correctness aren't inferred.

The [SceneIR guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/scene-understanding.md) covers the schema, every option, and size limits.
