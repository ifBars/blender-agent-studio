# No-plugin versus plugin modeling pilot

The live comparison gallery uses eight fresh isolated no-plugin generations
paired with the eight frozen plugin-skill generations from the earlier spatial
campaign. It does not use the experimental added-guidance condition as a baseline.

## Controls

- Tasks: joinery stool and articulated task lamp, four models each.
- GPT 6 Astra (`gpt-6-astra`) and GPT 6.1 Sol (`gpt-6.1-sol`) through Codex 0.160.0.
- Opus 5.5 (`claude-opus-5-5`) and Sonnet 5.5 (`claude-sonnet-5-5`) through Claude Code 2.1.287.
- Medium effort, 12-minute generation budget, concurrency two, Blender 5.2.2 LTS.
- Same frozen task/evaluator fingerprints and neutral seven-view renders.
- No-plugin execution disables plugin/skill discovery and MCP. Plugin execution
  explicitly provides the frozen plugin skills and scripts, without added guidance.
- Original artifacts remain unchanged. The gallery retains raw scores and
  applies the documented stool hardware-name correction equally to both conditions.
- Two fresh Astra judges per pair, reversed A/B order, with condition labels hidden.

No-plugin runs were collected later than the reused plugin runs. Generation
order is not counterbalanced. One generation per condition cannot establish a
general success rate or model ranking. Multiple judgments are opinions about
the same assets. This is a skill-workflow comparison, not an MCP ablation.
Concurrent wall-clock times are not a latency benchmark.

## Observed results

Both reviews preferred the plugin in all eight pairs. Technical gates passed in 4/8 no-plugin submissions and 7/8 plugin submissions after the naming correction. These are observed pilot outcomes, not general success rates. Sonnet's lamp is a technical regression: its no-plugin run passed, while its plugin run failed geometry checks.

Scores and visual votes read **no plugin / with plugin**.

| Task | Model | Technical score and gate | Visual votes |
| --- | --- | --- | --- |
| Splayed-leg joinery stool | GPT 6 Astra | 100 pass / 100 pass | 0 / 2 (0 ties) |
| Splayed-leg joinery stool | GPT 6.1 Sol | 98 fail / 98.33 pass | 0 / 2 (0 ties) |
| Splayed-leg joinery stool | Opus 5.5 | 96 pass / 100 pass | 0 / 2 (0 ties) |
| Splayed-leg joinery stool | Sonnet 5.5 | 90.94 fail / 96 pass | 0 / 2 (0 ties) |
| Articulated task-lamp clearance holdout | GPT 6 Astra | 91.83 fail / 100 pass | 0 / 2 (0 ties) |
| Articulated task-lamp clearance holdout | GPT 6.1 Sol | 89.83 fail / 100 pass | 0 / 2 (0 ties) |
| Articulated task-lamp clearance holdout | Opus 5.5 | 100 pass / 100 pass | 0 / 2 (0 ties) |
| Articulated task-lamp clearance holdout | Sonnet 5.5 | 100 pass / 96 fail | 0 / 2 (0 ties) |

### Failed checks

- **Splayed-leg joinery stool / GPT 6.1 Sol / No plugin:** maximum_extent: 200.000m maximum extent; limit 3m.
- **Splayed-leg joinery stool / GPT 6.1 Sol / With plugin:** material_count: 2 materials; minimum 3.
- **Splayed-leg joinery stool / Opus 5.5 / No plugin:** uv_coverage: 0/43 meshes have UV layers; minimum ratio 0.80.
- **Splayed-leg joinery stool / Sonnet 5.5 / No plugin:** semantic_part_coverage: 3/4 required semantic part groups found; material_count: 2 materials; minimum 3; uv_coverage: 12/21 meshes have UV layers; minimum ratio 0.80.
- **Splayed-leg joinery stool / Sonnet 5.5 / With plugin:** uv_coverage: 0/21 meshes have UV layers; minimum ratio 0.80.
- **Articulated task-lamp clearance holdout / GPT 6 Astra / No plugin:** semantic_part_coverage: 5/6 required semantic part groups found; invalid_geometry: 24 invalid vertices, degenerate faces, or zero-length edges.
- **Articulated task-lamp clearance holdout / GPT 6.1 Sol / No plugin:** semantic_part_coverage: 5/6 required semantic part groups found; invalid_geometry: 612 invalid vertices, degenerate faces, or zero-length edges; maximum_extent: 200.000m maximum extent; limit 3m.
- **Articulated task-lamp clearance holdout / Sonnet 5.5 / With plugin:** invalid_geometry: 130 invalid vertices, degenerate faces, or zero-length edges.

All sixteen submissions and both reviews per pair remain in the gallery.
Some failed checks deduct score without failing a critical gate. A technical
pass does not certify visual quality, contacts, UV suitability or game readiness.

The downloadable data retains raw scores, corrected scores and original artifact
hashes. Sonnet's plugin stool changes from 89.75/fail to 96/pass under the documented
hardware-name correction; its geometry is unchanged.

## Interpretation

The evaluator frames the submitted scene, including saved staging geometry.
The no-plugin Astra stool appears small in its views; the no-plugin Sol stool
and lamp include a 200-meter floor. That staging limits or obscures the asset
in the standard views. Visual preference therefore includes presentation and
delivery quality, not only the quality of the underlying asset. These original
renders remain unchanged; no post-hoc crop or geometry cleanup was substituted.

## Reproduce the collection

Use the same frozen plugin source and existing unmodified plugin summaries:

```powershell
bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_vanilla_baselines.ts `
  --output ../benchmarks/plugin-vs-vanilla-2026-10-02/runs `
  --snapshot ../benchmarks/spatial-2026-10-02/snapshot `
  --plugin-runs ../benchmarks/spatial-2026-10-02/runs
```

Output must be a fresh directory. The campaign records commands, source
fingerprints and control mismatches. Run `compare_runs.ts` with each vanilla
summary as baseline, the matching current-plugin summary as candidate, and two
judges. Then follow the [gallery build instructions](spatial-benchmarks.md#build-the-comparison-gallery).
The builder checks execution metadata instead of trusting condition labels.

The whole-scene suite remains implemented and calibrated, not a completed model
campaign. See its [protocol](whole-scene-benchmark.md).
