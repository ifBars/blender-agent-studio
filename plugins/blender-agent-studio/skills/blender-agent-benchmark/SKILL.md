---
name: blender-agent-benchmark
description: Benchmark Blender modeling agents, skills, prompts, scripts, or MCP tools with paired isolated runs. Use for baseline-versus-plugin comparisons, regression suites, skill forward-testing, MCP usefulness evaluation, score calibration, or claims that a Blender workflow improves mesh, visual, structural, animation, cost, or completion quality.
---

# Blender Agent Benchmark

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Measure changes with the same tasks, model, effort, limits, Blender build, and evaluator. Preserve natural agent behavior.

## Protect benchmark integrity

1. Create isolated directories for every condition and repetition.
2. Do not leave the other condition's code, renders, metrics, or expected fixes where the agent can discover them.
3. Keep the user-facing task prompt identical except for explicit skill invocation in the plugin condition.
4. Use `codex exec --ignore-user-config` for the no-plugin baseline.
5. Use a pinned plugin directory in a fresh invocation for the plugin condition. The default is the plugin containing the runner; `--skill-root` selects a different snapshot.
6. Record CLI version, model, effort, Blender build, duration, tool calls, failures, and output hashes.
7. Evaluate outputs after generation. Do not leak hidden rubric details to the agent.

Read [references/methodology.md](references/methodology.md) before changing fixtures, scoring, or comparison claims.
Read [references/open-source-benchmark-landscape.md](references/open-source-benchmark-landscape.md)
when designing new suites or borrowing evaluation ideas from other Blender
benchmarks.
Read [references/validated-results.md](references/validated-results.md) only
when reviewing the plugin's recorded validation result, not while generating a
benchmark submission.

## Fast development loop

Start improvements from saved failure evidence, not another full generation
suite. Default to a five-minute wall-clock budget for one targeted repair:

1. Identify the highest-impact visible defect in an existing saved asset.
2. Copy its durable source and inputs into a new repair directory. Preserve the
   original asset and images as the before condition.
3. Use Luna or Terra for one local source repair. Preserve good proportions,
   silhouette, materials and detail outside the affected area; do not rebuild
   the asset from scratch or simplify it to satisfy a numerical check.
4. Regenerate once and request two relevant fixed views at resolution 256 with
   `blender_render_evidence`, the same explicit presentation and framing inputs
   for before and after. Open the images; inspect full-size views if needed.
5. Use one Astra visual review to check the stated defect and collateral loss
   of finish. Keep the original if the repair does not visibly help. Record
   elapsed time, exact source changes and any unresolved weakness.

This is a repair demonstration, not evidence of a general model capability
gain. Reuse existing deterministic metrics when their inputs are unchanged.
Run affected technical tests after the edit; do the full export/multiview gate
once on a retained candidate. Reserve repeated from-scratch generations and
multiple independent judges for a release-level capability claim or an explicit
request. Do not turn a small repair into an unattended multi-hour campaign.

## Run the suites

For Astra, pass `--profile astra` (model `gpt-6-astra`, effort `medium`). The
`sol`, `terra`, and `luna` profiles select their corresponding GPT-5.6 models
at the same effort. Explicit `--reasoning` overrides effort, not the model.
Use an explicit profile or `--model` for reproducible comparisons; runs using
`configured default` are exploratory because model identity is not pinned.

Separate two experiments: old/revised skills on Astra, then fixed revised
skills on Astra/Sol/Terra/Luna. Keep fixture, effective effort, Blender build,
limits, permissions, and evaluator fixed. The existing non-regression gate
requires matching models; cross-model results are descriptive model comparisons,
not proof that a skill revision improved. Never replace historical result labels
with Astra or attribute a simultaneous model-and-skill change to either alone.

Use `scripts/run_benchmark.ts`:

```powershell
bun "<skill-root>\scripts\run_benchmark.ts" `
  --suite quick `
  --mode baseline `
  --output "<run-root>\baseline"

bun "<skill-root>\scripts\run_benchmark.ts" `
  --suite quick `
  --mode plugin `
  --output "<run-root>\plugin"
```

Start with a smoke task to validate the harness. Use at least three representative tasks and repeated runs before claiming a general capability gain.

Use `scripts/compare_runs.ts` for randomized blinded multiview judging. Use
`scripts/rescore_run.ts` to recompute deterministic scores after a scorer
change without rerunning agents.

Keep `full` as the historical regression suite. Use the opt-in `challenge`
suite for harder environment, procedural, rigging/deformation, and simulation
tasks so broader coverage does not silently change the legacy comparison:

Use `quality` for static character form, walk cycles, facial combinations, liquid
pouring and cloth draping. Use `reference` with `--reference-dir` for two-view
image reconstruction. These suites add evaluated motion and bake prerequisites;
they do not replace visual review. Read [quality suite protocol](references/quality-suites.md)
for input contracts and limitations. Evaluate clarification separately using
[intake cases](references/intake-cases.json); the fully specified asset fixtures
deliberately forbid follow-up questions and cannot measure clarification quality.

```powershell
bun "<skill-root>\scripts\run_benchmark.ts" `
  --suite challenge `
  --mode skills `
  --condition-label revised-plugin `
  --output "<run-root>\revised-challenge"
```

The challenge suite also contains `realistic_fire_lantern_showcase`, an
isolated portfolio-realistic lamp task with a 360-frame moving flame and a
required 15-second MP4. Run only that task with the opt-in iterative workflow:

```powershell
bun "<skill-root>\scripts\run_benchmark.ts" `
  --suite challenge `
  --tasks realistic_fire_lantern_showcase `
  --mode skills `
  --condition-label cached-iterative-fire-lantern `
  --skill-root "<installed-plugin-directory>" `
  --output "<run-root>\fire-lantern"
```

This fixture requires `lamp_fire_15s.mp4`, `iteration_review.json`, a 1-360
authored and exported action at 24 fps, six-view evidence, and sampled flame
frames. The runner uses `ffprobe` from `PATH`, or `FFPROBE_EXECUTABLE` when set,
to gate the video duration, frame rate, and frame count.

Use the opt-in `gauntlet` suite for the deliberately unsaturated integrated
task. It combines an environment, editable procedural conveyor, rigged robot,
simulation-derived capsule motion, deterministic animation, materials,
lighting, export, and before/after repair evidence in one causal scene:

```powershell
bun "<skill-root>\scripts\run_benchmark.ts" `
  --suite gauntlet `
  --mode skills `
  --condition-label candidate-gauntlet `
  --output "<run-root>\candidate-gauntlet"
```

Compare gauntlet submissions with three or more blinded judges. The comparison
report includes `verifiedScores` for this task: 60% deterministic, 25%
task-authored visual criteria, and 15% broad multiview quality. A hard-gate
failure caps the result at 49, loss of any critical criterion majority at 84,
loss of any criterion majority at 94, and anything short of a perfect
deterministic score, unanimous criterion passes, and exceptional scores on
every visual dimension at 99. This makes partial credit accessible without
making metric gaming sufficient for saturation.

Every task carries explicit, category-tagged visual criteria. The blinded
judge must answer each criterion for both candidates; keep those pass rates
separate from broad aesthetic dimensions and deterministic scores.

Noninteractive Codex cancels MCP tool calls that require approval. If testing
an MCP condition, pass `--bypass-approvals` to every compared condition and
use isolated benchmark directories. Do not give only the MCP condition broader
permissions.

Use `scripts/benchmark_mcp.ts --asset <path> --output <new-dir>` to verify that
the MCP transport returns the same deterministic metrics as direct CLI
evaluation. Equivalent results prove transport correctness, not a modeling
quality gain.

## Compare conditions

The runner disables global plugins, memories, host skill entries and automatic
project instruction injection with process-local CLI arguments, while retaining
explicitly prompted snapshot skills and MCP. It does not edit user configuration.
`--ignore-user-config` alone does not isolate host skills. Confirm these controls
on the installed CLI before a campaign; unsupported switches or overly large
Windows argument lists must be resolved before launching benchmark generations.

Pinned plugin runs ignore user configuration and load the selected skills by
path. In `skills_mcp` mode, the runner explicitly starts that snapshot's
`mcp/server.ts` as `bas_benchmark`, checks its tool inventory, and records it
with a source fingerprint. Confirm actual new-tool use in the agent trace;
an available tool that was never called cannot establish its modeling benefit.
Agent events and stderr are written live, with a PID record for unattended
monitoring. Check the process and final process record before restarting work.

Keep judging identities in memory until judging finishes. Do not place a
condition-mapping file in a judge's working directory. Use identical judge
models and effort across pairs and record the selected model explicitly.

Keep these dimensions separate:

- execution/export validity;
- prompt and structural compliance;
- geometry/game-readiness;
- finish-profile compliance, including polished-smooth versus explicitly
  low-poly intent;
- UV, shading, refinement, material, texture, and presentation signals;
- multiview visual quality;
- physical plausibility;
- animation quality when applicable;
- context/export correctness;
- time, turns, tool failures, and cost.

Use hard gates before the weighted score. Prefer blinded pairwise visual review over uncalibrated absolute aesthetic scores.
Counterbalance A/B image order across judges and preserve per-judge mappings.
Do not let a low triangle count compensate for a blockout-looking final asset.

When comparing a revision with the current plugin, give the runs distinct
`--condition-label` values and run `compare_runs.ts --require-non-regression`.
Pass `--skill-root <plugin-directory>` to pin each run to an exact checked-out
or installed plugin revision instead of whichever plugin is active globally.
The gate fails on missing baseline pairs, hard-gate loss, any per-task automated
score decrease, a blinded visual majority loss, or a critical visual criterion
that changes from majority-pass to majority-not-pass. Do not use gains on new
challenge tasks to offset a regression on the historical suite.

Use `compare_runs.ts --tasks <comma-separated-task-ids>` to compare a repaired
slice against a larger saved baseline without treating intentionally omitted
baseline tasks as missing evidence.

## Iterate

1. Inspect failed metrics, renders, videos, and traces.
2. Identify one transferable workflow defect.
3. Change the smallest relevant skill, deterministic tool, or MCP surface.
4. Rerun the same slice.
5. Run a holdout task before retaining the change.

Do not retain benchmark-specific instructions that reveal fixture answers or damage ordinary modeling behavior.
