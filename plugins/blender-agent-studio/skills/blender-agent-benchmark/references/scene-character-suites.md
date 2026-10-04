# Scene and game-character suites

Keep these suites separate from the historical `full` tasks.

| Suite | Tasks | Delivery |
| --- | --- | --- |
| `scenes` | `decorated_reading_room`, `coastal_cafe_holdout` | Reproducible render-only .blend and source; no GLB gate. |
| `scenes` | `night_market_courtyard` | Complete exportable low-poly environment, native scene and fresh GLB import. |
| `game_characters` | `game_ranger_character`, `game_badger_merchant_holdout` | Static polished characters with form, fit, material and export review. |
| `game_characters` | `game_scout_deformation` | Continuous skinned body and native/fresh-export bend, reach and twist evidence. |

Scene tasks require `SceneHero`, `SceneReverse` and `SceneDetail` cameras.
Evaluation renders their authored lighting/world/color management at a 512px
longest edge and 16-sample cap. A contact sheet and original views feed the
blinded judge. Clean-source reproduction also renders all cameras at 128px
and one sample to verify usable cameras and available image/library dependencies.
This establishes reproducible rendering, not pixel-identical images or art quality.

Scorer version 7 keeps historical export-task weights and requirements. For
render-only tasks, native rendering/dependency/material checks replace export
checks. Updated task/evaluator fingerprints prevent silent reuse of incompatible
old runs. Never invent missing provenance or confuse successful code tests with
better model output.

These new scenes use explicit visual support questions; numerical contacts and
per-instance budgets in the 45-instance depot remain specific to that existing
suite. An appealing hero must not compensate for unfinished reverse zones or
unusable routes. The scout's sampled deformation proves changing skin geometry,
not all joint poses or target-engine compatibility. Judges see still samples;
continuous timing remains unverified without playback.

Run baseline and skills with the same explicit model, effort, generation budget,
Blender build, CLI, permissions and evaluator. Use `--mode baseline` with no
guidance file for genuine no-plugin runs. Freeze skills for plugin runs and
keep skills-versus-MCP effects separate. Compare with the existing blinded
`compare_runs.ts`. Repeated independent pairs and holdouts are needed for a
general improvement claim. Do not publish new gallery rows before completing
and judging the actual outputs.

Optional modeling timelapses are outside ordinary benchmark generation. If a
campaign requests them, give every condition the same capture requirements and
budget and report overhead separately.
