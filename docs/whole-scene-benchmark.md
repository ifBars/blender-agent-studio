# Whole-scene game environment benchmark

`--suite whole_scene` selects `low_poly_courier_depot`: a complete 20 × 16 m
environment with **21 asset families and 45 instances**. It is separate from
historical and spatial suites. The scene includes architecture, a loading area,
cargo, furniture, utility props and vegetation. Its explicit low-poly profile
does not reward smoothing or subdivision intended for polished-smooth props.

The public brief defines instance names, counts, per-instance triangle budgets,
a 180,000-triangle scene ceiling, 24-material ceiling, unit scale, orientation,
placement anchors and an unobstructed approach lane. Every instance is its own
critical visual criterion. A polished building cannot offset an unfinished
bench or background tree.

## Evaluate the pieces and the assembly

The runner evaluates both the `.blend` and a fresh GLB import. It checks:

- all required asset roots and ownership of visible meshes;
- per-instance geometry/material/texture-UV validity and triangle budgets;
- scene bounds, root scale, upright orientation and specified facing directions;
- explicit support dependencies, missing supports and cycles;
- sampled signed surface distances at declared feet/wheels using evaluated
  vertices and downward rays against the actual supporting asset;
- sampled route obstructions and cross-asset triangle-intersection candidates;
- root-transform and world-bounds preservation after export;
- clean reproduction of the scene and manifest.

Then it renders perspective, front and rear evidence of **all 45 individual
instances**, not just a representative of each family. Each instance gets an
isolated art-review sheet and a focused sheet with surrounding scene geometry
retained. Isolated images cannot prove scene contact. The per-instance verdict
requires both finished art and credible visible integration in the context
views; occluded contacts remain unclear. Scene overviews and numerical
diagnostics provide additional placement evidence.

`compare_runs.ts` reviews the scene overview and the individual assets in
separate blinded calls. Asset reviews are batched three instances at a time to
keep close views readable. The A/B mapping is consistent within a judge and
counterbalanced across judges. Every per-instance criterion remains visible
in the report and non-regression gate. Overview preference votes and aesthetic
means are not a substitute for per-instance verdicts. With two judges, a full
pair requires 32 judge calls: plan its time and usage accordingly.

## Controlled workflow comparison

Freeze one plugin revision. Run the same brief, model, effort and budget twice:
current skills, and current skills plus `docs/whole-scene-guidance.md`. That
guidance introduces an asset ledger, dependency order, representative asset
checks before replication, batch integration and a final per-instance review.
It is experimental and does not alter the default skills.

```powershell
bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_benchmark.ts `
  --suite whole_scene --mode skills --agent codex --model gpt-6.1-sol `
  --reasoning medium --timeout-minutes 60 --bypass-approvals `
  --condition-label systematic `
  --guidance-file docs/whole-scene-guidance.md `
  --output ../benchmarks/depot-sol-systematic
```

Use `--agent claude-code --model claude-opus-5-5` or
`claude-sonnet-5-5` for Claude Code, and `gpt-6-astra` for Astra. The comparison
run must have the same 60-minute generation budget. Evaluator rendering and
judging occur after generation and have separate bounded processes.

## Evidence limits

A `technicalPass` still returns `review_required`. It does not certify artistic
quality, target-engine collision behavior, draw-call cost, frame rate, texture
streaming, LODs or a specific game's integration requirements. No engine was
specified, so the suite checks a portable static GLB asset contract.

Support sampling covers at most 16 bottom vertices of each declared contact
mesh. A model can omit a foot from its declaration; visual checks must detect
that. Nine walkway rays do not prove every possible path is clear. Attachment
AABBs do not prove surface contact. Triangle-overlap candidates can include
intentional touching and miss full containment. Preserve these limitations in
reports rather than labeling the entire scene collision-free.

The evaluator is calibrated with deliberately floating, buried, misoriented,
self-supported and missing-instance fixtures. That proves those detection
paths, not that a model has completed the full environment.

The October 2 implementation check also ran the complete evaluator against a
45-instance calibration scene: isolated and contextual render sets were generated, native
and fresh-export checks passed, clean reproduction passed, and the submitted
Blender file's hash was unchanged. These simple calibration primitives are not
an art-quality submission or a model benchmark result.
