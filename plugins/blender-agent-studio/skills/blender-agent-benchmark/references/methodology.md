# Benchmark methodology

## Conditions

- `baseline`: current Codex agent with user config ignored and no plugin guidance.
- `skills`: plugin skills and bundled scripts, MCP tools unavailable or explicitly disabled.
- `skills_mcp`: same skills plus Blender MCP tools.

Run `baseline` versus `skills` first. Compare `skills` versus `skills_mcp` separately so an MCP cannot receive credit for skill improvements.

## Suites

- `smoke`: one simple task; validates the harness only.
- `quick`: at least one prop, one multi-part assembly, and one animation task.
- `full`: broader categories with at least three repetitions and holdouts.

## Required controls

- same model and reasoning effort;
- same prompt and attached references;
- same wall-clock and tool permissions;
- same exact Blender executable;
- clean task directories;
- deterministic evaluator version;
- randomized or hidden condition labels for visual judging.

## Scoring

Reject invalid submissions before computing a quality score. Preserve a dimension vector even when presenting a weighted headline.

Suggested default weights for static assets:

- specification compliance: 25;
- multiview visual quality: 20;
- geometry and game-readiness: 15;
- physical/assembly plausibility: 15;
- materials and presentation: 10;
- context/export correctness: 10;
- reproducibility: 5.

Animation fixtures replace irrelevant static weight with animation quality.

## Claims

- One successful task is a harness smoke, not proof.
- One run per condition is directional.
- A plugin gain is credible when it repeats across task types, does not regress hard gates, and survives a holdout.
- Report failures and excluded rows.
- Keep raw metrics and artifacts so scoring changes can be recomputed without rerunning agents.
