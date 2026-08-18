---
name: blender-agent-benchmark
description: Benchmark Blender modeling agents, skills, prompts, scripts, or MCP tools with paired isolated runs. Use for baseline-versus-plugin comparisons, regression suites, skill forward-testing, MCP usefulness evaluation, score calibration, or claims that a Blender workflow improves mesh, visual, structural, animation, cost, or completion quality.
---

# Blender Agent Benchmark

Measure changes with the same tasks, model, effort, limits, Blender build, and evaluator. Preserve natural agent behavior.

## Protect benchmark integrity

1. Create isolated directories for every condition and repetition.
2. Do not leave the other condition's code, renders, metrics, or expected fixes where the agent can discover them.
3. Keep the user-facing task prompt identical except for explicit skill invocation in the plugin condition.
4. Use `codex exec --ignore-user-config` for the no-plugin baseline.
5. Use the installed plugin in a fresh invocation for the plugin condition.
6. Record CLI version, model, effort, Blender build, duration, tool calls, failures, and output hashes.
7. Evaluate outputs after generation. Do not leak hidden rubric details to the agent.

Read [references/methodology.md](references/methodology.md) before changing fixtures, scoring, or comparison claims.
Read [references/open-source-benchmark-landscape.md](references/open-source-benchmark-landscape.md)
when designing new suites or borrowing evaluation ideas from other Blender
benchmarks.
Read [references/validated-results.md](references/validated-results.md) only
when reviewing the plugin's recorded validation result, not while generating a
benchmark submission.

## Run the suites

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
