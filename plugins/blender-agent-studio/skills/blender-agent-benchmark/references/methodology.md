# Benchmark methodology

## Conditions

- `baseline`: current Codex agent with user config ignored and no plugin guidance.
- `skills`: plugin skills and bundled scripts, MCP tools unavailable or explicitly disabled.
- `skills_mcp`: same skills plus Blender MCP tools.

Run `baseline` versus `skills` first. Compare `skills` versus `skills_mcp` separately so an MCP cannot receive credit for skill improvements.

## Suites

- `smoke`: one simple task; validates the harness only.
- `quick`: at least one prop, one multi-part assembly, and one animation task.
- `full`: broader categories with at least three repetitions, holdouts, a
  polished-smooth finish task, and an explicitly low-poly control.
- `challenge`: opt-in harder environment, procedural-system,
  rigging/deformation, and simulation tasks. It expands coverage without
  changing the historical `full` regression anchor.
- `gauntlet`: one opt-in integrated lunar sample-cell task spanning environment
  construction, procedural controls, rigging, constraints, simulation,
  deterministic animation, lighting, materials, export, and evidence-backed
  repair. It is deliberately separate from `full` so difficulty experiments
  cannot rewrite the historical regression anchor.

Tag every fixture by task category, capability coverage, and finish profile.
Track at least geometry, materials, placement/spatial relations, animation when
applicable, and instruction following. Lighting and texture coverage should be
reported when a task genuinely exposes those dimensions.

## Required controls

- same model and reasoning effort;
- same prompt and attached references;
- same wall-clock and tool permissions;
- same exact Blender executable;
- clean task directories;
- deterministic evaluator version;
- hidden condition labels and counterbalanced A/B image order for visual
  judging.
- raw Codex JSON events plus summarized duration, tool calls, tool failures,
  error items, and token usage.
- a separate condition label when comparing two revisions that use the same
  execution mode.
- an explicit `--skill-root` for each plugin revision so global installation
  state cannot drift between conditions.

## Scoring

Reject invalid submissions before computing a quality score. Preserve a dimension vector even when presenting a weighted headline.

Suggested reader-facing dimensions for static assets:

- specification compliance: 25;
- multiview visual quality and final-stage completeness: 20;
- geometry and game-readiness: 15;
- physical/assembly plausibility: 15;
- materials, textures, surface finish, and presentation: 15;
- context/export correctness: 10;
- reproducibility: 5.

Animation fixtures replace irrelevant static weight with animation quality.

The deterministic scorer is a proxy layer. It should detect finish signals such
as UV coverage, smooth-versus-flat shading appropriate to the requested finish
profile, and refinement evidence, but those signals must not replace blinded
multiview review. A model can game polygon counts, modifier counts, or material
counts without producing a good asset.

Preserve two distinct controls:

- polished-smooth is the default unless the task explicitly requests another
  finish;
- explicitly low-poly fixtures should penalize unwanted smoothing or
  subdivision rather than rewarding the default.

For visual comparison, give judges the actual visible requirements, score
surface finish, material/texture quality, lighting/presentation, and
final-stage completeness separately, and alternate the A/B order between
judges to reduce position bias.

Also provide task-authored visual questions tagged by object presence, count,
attribute, spatial relation, material, lighting, style, motion, or deformation.
Require an answer for every question and retain `unclear` as missing evidence,
not a pass. Report criterion pass rates beside broad visual dimensions.

For the integrated gauntlet, also report a verified composite score:

- deterministic inspection and rubric checks: 60%;
- all per-judge task-authored visual-criterion outcomes: 25%;
- ten broad multiview quality dimensions: 15%.

Apply severity caps before reporting the result: 49 after a hard-gate failure,
84 when any critical criterion lacks a passing majority, 94 when any criterion
lacks a passing majority, and 99 unless deterministic scoring is perfect,
every judge passes every criterion, and every broad dimension is exceptional.
The low end intentionally retains continuous partial credit, while a perfect
result requires agreement among structurally different evaluators. This is a
design target, not an empirical population claim: calibrate the 10% floor and
observed saturation rate across representative models before publishing
cross-model difficulty claims.

## Non-regression gate

Compare the current plugin with a revision on the unchanged historical suite
before accepting gains on challenge tasks. Fail the strict gate when:

- a baseline result or contact sheet has no candidate pair;
- a previous hard-gate pass becomes a failure;
- any paired task's deterministic score decreases under the same scorer;
- the baseline wins a majority of blinded visual votes for a pair;
- a critical visual criterion moves from majority-pass to majority-not-pass.

Do not average regressions away with improvements on other tasks. Treat a
judge-only change as an evaluator revision, not proof that the generator
improved.

## Claims

- One successful task is a harness smoke, not proof.
- One run per condition is directional.
- A plugin gain is credible when it repeats across task types, does not regress hard gates, and survives a holdout.
- A revised plugin is retainable only when it passes the unchanged regression
  anchor; challenge-suite gains are additive evidence.
- Report failures and excluded rows.
- Keep raw metrics and artifacts so scoring changes can be recomputed without rerunning agents.
- Treat total tokens as a usage proxy, not a dollar-cost claim, unless actual
  billing data is available.
- Do not compare rescored historical runs with new runs unless the inspector and
  scorer schema versions are compatible or the limitation is stated.
