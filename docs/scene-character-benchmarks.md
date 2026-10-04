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
