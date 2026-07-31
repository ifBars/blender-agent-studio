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

## Iterate

1. Inspect failed metrics, renders, videos, and traces.
2. Identify one transferable workflow defect.
3. Change the smallest relevant skill, deterministic tool, or MCP surface.
4. Rerun the same slice.
5. Run a holdout task before retaining the change.

Do not retain benchmark-specific instructions that reveal fixture answers or damage ordinary modeling behavior.
