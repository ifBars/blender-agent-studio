# Spatial assembly benchmarks

The opt-in `spatial` suite adds `joinery_stool` and
`task_lamp_clearance_holdout` without changing historical suites. Their visual
criteria distinguish required contacts, unintended penetration and intentional
negative space. Automated structural scores cannot settle these criteria.

`run_benchmark.ts` accepts `--agent codex` (default) or `--agent claude-code`.
Pass full model IDs explicitly. Historical `--profile sol` still denotes
GPT 5.6 Sol; use `--model gpt-6.1-sol` for GPT 6.1 Sol. Claude runs use safe mode,
explicit pinned skill-file prompts, disabled slash commands and strict empty
MCP configuration. Subscription authentication is retained. Claude MCP mode is
rejected until its isolation is validated. Installed-plugin names may remain in
Claude initialization telemetry; inspect actual tools and skill inventories.

Compare current `skills` runs against otherwise identical runs with
`--guidance-file docs/spatial-closure-guidance.md`. This tests a bundled workflow
intervention with the same available scripts, not an isolated MCP-tool effect.
The runner records CLI identity, prompt guidance and its hash, model, effort,
tool events, timeout, task/evaluator/skill fingerprints and artifact hashes.
It normalizes Claude cache-read/write usage explicitly; token accounting across
providers is not equivalent billing. CLI-reported cost is retained separately.

Example from the repository root (use a new output directory for every run):

```powershell
bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_benchmark.ts `
  --suite spatial --tasks joinery_stool --agent claude-code `
  --model claude-opus-5-5 --reasoning medium --mode skills `
  --timeout-minutes 12 --bypass-approvals `
  --guidance-file docs/spatial-closure-guidance.md `
  --condition-label spatial-guided --output ../benchmarks/opus-guided
```

Freeze the plugin source before dispatch. Counterbalance condition order, keep
generation budgets and evaluator settings fixed, and evaluate after generation.
The spatial evaluator includes a bottom view with the six historical views.
Record blind visual criterion outcomes separately from deterministic scores.
`unclear` is missing evidence, never a pass. Preserve excluded rows and failure
logs. One repetition is a pilot; a general improvement claim needs multiple
repetitions, varied task types and a holdout. Do not promote experimental
guidance into default skills solely on a pilot's score.

## Build the comparison gallery

The gallery compares `baseline` execution without plugin access against
`skills` execution with a pinned plugin and no experimental guidance. Its
builder rejects plugin-versus-plugin pairs even when their labels say vanilla.
The earlier current-versus-guided study remains a separate experiment.

After all eight paired runs and `compare_runs.ts` judgments are complete, prepare the
local gallery from their preserved evidence:

```powershell
bun tools/build-benchmark-previews.ts `
  --vanilla-runs ../benchmarks/plugin-vs-vanilla-2026-10-02/runs `
  --plugin-runs ../benchmarks/spatial-2026-10-02/runs `
  --judging ../benchmarks/plugin-vs-vanilla-2026-10-02/judging
bun run docs:build
bun run docs:dev
```

Open `/comparisons/`. The slider supports pointer dragging, keyboard arrows,
model/task/view selection and shareable query parameters. The downloaded JSON
retains raw and corrected scores, artifact/image hashes, provenance and both
blinded reviews. Each submitted scene is framed to fit under the same camera-view
and lighting preset, including saved staging geometry. Oversized staging can
make the asset appear small and limit visual judgments. This is not a registered
geometric difference image.

Generated previews remain under the ignored `site/public/benchmarks/` folder,
following the repository's rule against committing benchmark renders. Build or
restore this gallery before a deployment; a clean checkout alone does not
contain the experimental images. `bun run docs:assets` downloads the curated
GitHub release archive pinned in `site/benchmark-previews.json`, checks its
SHA-256, verifies all image hashes and restores those previews. The Pages
workflow performs this step automatically. Raw runs and agent traces are not
part of the published archive. The page reports unavailable data explicitly.
