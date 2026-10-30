# Scene and game-character suites

Keep these suites separate from the historical `full` tasks.

| Suite | Tasks | Delivery |
| --- | --- | --- |
| `scenes` | `decorated_reading_room`, `coastal_cafe_holdout` | Reproducible render-only .blend and source; no GLB gate. |
| `scenes` | `night_market_courtyard` | Complete exportable low-poly environment, native scene and fresh GLB import. |
| `game_characters` | `game_ranger_character`, `game_badger_merchant_holdout` | Static polished characters with form, fit, material and export review. |
| `game_characters` | `game_scout_deformation` | Continuous skinned body and native/fresh-export bend, reach and twist evidence. |
| `game_characters` | `cartoon_outfit_motion` | Large-headed cartoon style, socks/shoes and accessories in a two-second walk, native/fresh-export pose samples. |

The cartoon outfit task preserves deliberately simplified hands and proportions.
Its visual criteria separately check ankle continuity, shoe form, accessory
support and joint deformation. Watch the required `walk.mp4` as well as the
sampled views; video metadata and changing skin geometry do not prove good
foot contact or attachment. Both old and revised skill conditions must receive
the same fixture. This new task does not rewrite historical task prompts or
establish realistic-human performance.

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

## Motion evidence revision

Motion tasks now render perspective, left and back samples from the native
asset. Tasks with `motionRequirement.inspectExport` also render those samples
from a fresh GLB import. The judge receives the side/rear sheets and the export
sheets with explicit A/B, format, view and frame labels. Missing sheets or
incomplete frame sets exclude the pair from judging rather than allowing a
native-only result to imply export quality.

Renderer settings version 4 includes evaluated collection-instance bounds.
The cartoon outfit rubric accepts an integrated body/outfit mesh; only the
explicit `CartoonBody` object name is required. Clothing and accessory presence
and continuity remain visual requirements. These changes alter task/evaluator
fingerprints. Historical generations and scores are not relabeled; regenerate
or rerender and rescore under matching controls before making a new comparison.
