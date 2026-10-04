# Scene comparisons published October 4, 2026

The [preview gallery](https://ifbars.github.io/blender-agent-studio/comparisons/) now contains **31 pairs**, retaining all 21 historical rows and their image hashes. Ten added pairs cover decorated reading rooms and night markets across GPT 6 Astra, GPT 6.1 Sol, Opus 5.5 and Sonnet 5.5, plus coastal cafés from Astra and Sol.

Eight pairs have two counterbalanced Astra reviews: 4 favor the baseline, 1 favor the plugin, and 3 have split votes or ties. Two market pairs lack valid reviews; no winner is assigned. These are one generation per condition and directional examples, not a general success rate.

## Controls and retained evidence

- Same task, generator model, medium effort and 30-minute generation budget within each pair; pinned plugin skills/scripts versus an isolated baseline. MCP is absent in both.
- Blender 5.2.2 LTS. Frozen plugin fingerprint: `6c2f75fb8f57c83625f23e2a254f146bcd2b45569b5a920e0d5aefc05a114891`.
- Six pairs completed before the CPU-resource halt; four completed afterward under the shared 20% CPU cap, Below Normal priority and one generation at a time. Pair metadata retain the resource policy and shared guidance hashes. Durations are descriptive and cannot rank latency across those policies.
- Technical scores use common scorer 9 against unchanged artifact hashes. Raw scorer 7 results remain in the downloadable data. The calibration permits finite render-only scene bounds and recognizes ordinary food names; geometry and export gates remain.
- The initial publication used existing authored camera evidence at its recorded resolution, without another Blender render pass. The HD update below replaces the display previews. Camera positions and lighting can differ between conditions. Saved source and models are unchanged. Astra market evaluator images were repaired from the same hashed source after an output-directory collision; those images have no new visual votes. Sol's original plugin market review-camera evidence remains unavailable; new HD display previews are recorded separately.
- All ten pairs with completed evaluator summaries in both conditions were included, regardless of scores, failed checks or visual preferences. Fourteen remaining planned pairs have no complete paired evaluator results: the Claude cafés and all game-character fixtures. Their original launch/evaluator failures remain archived; they are not counted as completed quality comparisons.

## Added rows

Scores and technical gates read no plugin / with plugin. Votes read no plugin / with plugin / tie.

| Task | Model | Technical score and gate | Votes |
| --- | --- | --- | --- |
| Complete decorated reading room | GPT 6 Astra | 96 fail / 100 pass | 1 / 1 / 0 |
| Complete decorated reading room | GPT 6.1 Sol | 96 fail / 93.5 fail | 2 / 0 / 0 |
| Complete decorated reading room | Opus 5.5 | 96 fail / 96 fail | 1 / 1 / 0 |
| Complete decorated reading room | Sonnet 5.5 | 100 pass / 100 pass | 0 / 2 / 0 |
| Complete low-poly night-market courtyard | GPT 6 Astra | 96 fail / 100 pass | Unreviewed |
| Complete low-poly night-market courtyard | GPT 6.1 Sol | 96 fail / 100 fail | Unreviewed |
| Complete low-poly night-market courtyard | Opus 5.5 | 100 pass / 100 pass | 2 / 0 / 0 |
| Complete low-poly night-market courtyard | Sonnet 5.5 | 100 pass / 100 pass | 2 / 0 / 0 |
| Decorated coastal cafe holdout | GPT 6 Astra | 96 fail / 93.5 fail | 2 / 0 / 0 |
| Decorated coastal cafe holdout | GPT 6.1 Sol | 96 fail / 100 pass | 1 / 1 / 0 |

## Workflow improvements

### HD preview update

The initial publication reused the low-resolution review evidence. The updated
viewer displays only HD previews: all 60 authored camera views for the ten new
pairs render at a 1536-pixel longest edge. These are new renders from the same
hashed saved models, preserving camera aspect ratios, lighting, materials and
compositing. Cycles renders prefer OptiX and GPU OpenImageDenoise; authored Eevee
scenes retain their engine. Jobs run sequentially under the 20% CPU cap.

The new previews include the previously missing Sol room/market and Astra café
camera views. Original scores, votes and original evidence are unchanged. The
Images dropdown is removed. A missing view disables the slider and displays the
available image in full instead of stretching a one-pixel placeholder across it.

Observed topology failures in repeated lathed props led to a pole-sharing lathe helper and prototype validation before duplication. The native helper probe removed zero-length pole edges on two profiles while preserving bounds and face counts. This is a targeted topology correction; the unchanged gallery outputs do not demonstrate a visual improvement from the revised helper. Rendering guidance now distinguishes GPU rendering from GPU denoising, and benchmark jobs enforce the resource limits above.
