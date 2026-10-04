# Full scenes and game characters

Two opt-in suites add six briefs without changing the historical `full`,
`quality`, `spatial` or `whole_scene` task sets.

| Suite | Task | Main review |
| --- | --- | --- |
| `scenes` | `decorated_reading_room` | Complete reading and desk zones, composition, materials, supports and reverse-zone finish. |
| `scenes` | `night_market_courtyard` | Three distinct low-poly vendors, seating, facade, player route, attachments and night lighting. |
| `scenes` | `coastal_cafe_holdout` | Different interior layout, service/seating zones and transparent pastry display. |
| `game_characters` | `game_ranger_character` | Static human identity, coherent form, fitted garments, hands/boots/back and export. |
| `game_characters` | `game_scout_deformation` | Actual native and fresh-export skin deformation in neutral, bend, reach and twist poses. |
| `game_characters` | `game_badger_merchant_holdout` | Nonhuman identity, different proportions, fitted clothing and export. |

See the bundled [protocol](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/scene-character-suites.md)
for rendering and scoring. The reading room and cafe are render-only; the
market and characters require fresh GLB import. Scenes use three authored
cameras rather than replacement studio lighting. Every task has explicit
visual criteria, including supports and secondary-zone finish. A technical
pass still needs blinded visual review.

## Run a matched pair

From the repository root, start with a single task, then expand to repetitions
and the holdouts. For example:

```powershell
bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_benchmark.ts `
  --suite scenes --tasks decorated_reading_room --mode baseline `
  --agent codex --model gpt-6.1-sol --reasoning medium `
  --timeout-minutes 30 --output ../benchmarks/reading-room-baseline

bun plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/run_benchmark.ts `
  --suite scenes --tasks decorated_reading_room --mode skills `
  --agent codex --model gpt-6.1-sol --reasoning medium `
  --timeout-minutes 30 --output ../benchmarks/reading-room-plugin
```

Use `--suite game_characters` for characters. Claude Code uses the same runner
with `--agent claude-code` and an explicit supported model. Keep brief, model,
effort, CLI, permissions, exact Blender build, evaluator, reference access and
time budget equal within each pair. Apply approval-bypass settings equally if
used. Compare summaries with `compare_runs.ts`, counterbalanced blinded judges
and explicit judge models. Preserve failures and `unclear` criteria.

## Candidate workflow improvements

The revised default scene guidance connects composition, representative asset
construction, purposeful decoration, support anchors and authored-lighting
review. Character guidance prioritizes complete form/fit and early acceptance
poses. These target integration failures and weak construction/detail, including
the simpler manufactured forms noted in a saved baseline-preferred lantern
review. Code tests establish that tools work; they cannot establish better art.

Validate old versus revised skills under a common current evaluator, then
no-plugin versus revised plugin separately. Preserve the old snapshot, images
and source hashes. Updated evaluator fingerprints intentionally prevent strict
comparisons to incompatible old runs. New-scene gains cannot offset historical
regressions. The six tasks are runnable coverage; new gallery results require
actual completed and judged generations.

## Extend the preview matrix

Freeze the plugin source, install its dependencies with Bun, then use
`tools/run-gallery-matrix.ts --tasks <comma-separated-task-ids>` with a fresh
`--output`, pinned `--skill-root`, existing `--existing-data` and an explicit
`--timeout-minutes`. It schedules one matched pair per task for each of the
four gallery models, counterbalances condition order and records progress.
Generations run sequentially (`--concurrency 1`); each pair retains its
counterbalanced condition order. On Windows the supervisor starts inside a
Job Object with a 20% aggregate CPU hard cap and Below Normal priority. Child
processes remain in the job, and closing its owner terminates the owned tree.
Initialization fails closed if Windows cannot apply the limit. Shared resource
guidance requests two Blender threads and GPU rendering, preferring OptiX/CUDA
on NVIDIA. GPU selection must be verified in renderer output. The CPU cap also
covers modeling, export and any CPU fallback. Other applications remain outside
this budget. Record any scheduling/resource amendments; earlier concurrent
results cannot support timing rankings against this policy.
Resource guidance also explicitly prefers GPU denoising: supported GPU OIDN,
then OptiX, with a bounded CPU fallback. This is separate from the Cycles render
device. To update guidance in a saved queue, first finish the current pair with
`--request-pause`, then resume with a fresh `--guidance-file` and explicit
`--amend-resource-guidance`. The runner rejects changes inside a partial pair,
retains each completed pair's original policy, and records the amendment.
Use `--request-pause --output <campaign>` to finish current pairs and stop
dispatching new ones, then `--resume` with the original inputs to continue.
Resume verifies the snapshot and controls, preserves completed attempts and
never reruns an interrupted directory. Stop the supervisor gracefully before
changing scheduling; terminating a Windows process owner can terminate its
active children. Infrastructure-interrupted attempts need explicit records
and separate fresh replacements.
`tools/judge-gallery-matrix.ts <runs> <fresh-output>` can review completed pairs
while the remaining generations run. Codex transport is shared between the
campaign and its judges; select `--codex-transport http` for documented
WebSocket infrastructure failures, preserving the interrupted campaign.

After the complete campaign, `tools/append-gallery-matrix.ts` accepts
`--existing-data`, `--runs`, `--judging`, `--output` and `--blender`. It checks
source hashes, matched controls and counterbalanced judgments; historical rows
and their image hashes are preserved. Missing evidence stays selectable without
an invented winner or score. Authored scene cameras remain authored; character
pose frames retain the review evidence. Previews default to a 1024 px cap;
`--preview-edge` accepts 384..1536. Original judge images are preserved.

An explicitly archived supervisor interruption can use `--recovery-runs` and
`--recovery-judging`. These must contain a fresh matched campaign with the same
snapshot and generation controls. The importer rejects replacing an existing
scored attempt and requires both original directories in
`supervisor-transition.json`; it records the replacement in the public row.
Use this for infrastructure recovery, never choosing a better-looking retry.

When recalibrating saved runs, give `rescore_run.ts` a fresh `--output` for
each condition. It verifies original artifact hashes and retains raw scores,
the generation evaluator and a separate rescore evaluator fingerprint.
For the October 3 campaign, use `summary-rescored-v9.json` beside each completed
`summary.json` before importing. Both conditions must have the same calibration
evaluator. Scorer 9 checks finite bounds for render-only interiors, allowing
sky cards and backdrops beyond the portable-asset extent ceiling. Exportable
scene and character limits and geometry gates are unchanged. It also recognizes
ordinary food ingredient names such as noodles and pastry; this name proxy
does not replace visual review. Preserve the earlier scorer 7/8 summaries.

Evaluator render directories are now fresh `evaluator-evidence-*` directories;
agents may keep their own `evidence` directories. If an older evaluator failed
only because its output directory collided with agent output, render both saved
assets with the same frozen renderer/settings into fresh directories. Rescore
with `--evidence-directory` (and `--reproduction-evidence-directory` when needed).
Overrides must match the native source hash, required cameras and dependency
preflight. Raw results remain unchanged. Review replacement images when the
original review lacked complete evidence.

After a resource interruption, `tools/merge-gallery-campaigns.ts --prior <runs>
--continuation <runs> --output <fresh-directory>` combines the pairs explicitly
recorded as complete at the halt with every continuation attempt, including
failures. It rejects changing the frozen source or generation controls and
does not choose between attempts by quality. It preserves original workdir
paths and records each pair's source campaign/resource limits. Shared resource
guidance is admitted only when its exact verified hash matches both conditions;
additional modeling guidance still disqualifies the no-plugin comparison.

Package only the referenced PNG/JSON gallery files in a release archive and
pin its SHA-256, pair count and unique image count in
`site/benchmark-previews.json`. Verify locally and after deployment with
`bun tools/verify-gallery-matrix.ts [--published]`. Budget the published site
below the [GitHub Pages size limit](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
before uploading. Build and browser checks establish gallery delivery, not
generated-art quality or a workflow improvement.
