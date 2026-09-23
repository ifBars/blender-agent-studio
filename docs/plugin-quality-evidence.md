# Plugin quality evidence

Does Blender Agent Studio improve the finished asset compared with the same
agent working without its skills? We test that with matched prompts, Blender
builds, models, time limits, and evaluators. A technical score, a visual vote,
and the time spent answer different parts of the question.

## Current paired samples

These runs compare plain Codex (`baseline`) with the plugin's modeling and
validation skills (`skills`). The MCP tools were not enabled, so the results
measure the guided workflow rather than an additional MCP benefit. Each row
compares one independently generated asset per condition. Three blinded GPT-6
Astra judges compared the six-view evidence for each pair, with the image order
alternated between judges. We repeated the lantern task twice under the same
controls.

| Task | Generator | Technical score and gate, baseline / skills | Visual preference | Generation time, baseline / skills |
| --- | --- | --- | --- | --- |
| Stylized signal lantern, first run | GPT-6 Sol | 96 fail / 100 pass | Skills 3–0 | 4.04 / 4.99 min |
| Stylized signal lantern, repeat 1 | GPT-6 Sol | 89.83 fail / 100 pass | Skills 3–0 | 6.52 / 4.92 min |
| Stylized signal lantern, repeat 2 | GPT-6 Sol | 96 fail / 100 pass | Baseline 3–0 | 5.60 / 6.60 min |
| Tabletop lever press | GPT-6 Astra | 94 fail / 100 pass | Skills 3–0 | 5.05 / 11.82 min |
| Winch drawbridge | GPT-6 Astra | 90 fail / 100 pass | Skills 3–0 | 5.34 / 11.41 min |

The first lantern baseline had nine invalid vertices, degenerate faces, or
zero-length edges. The two repeat baselines also failed the geometry check.
Repeat 1 missed one required semantic part group and exported a 200-meter
preview floor in an asset limited to three meters. We hid that floor when
rerendering its saved scene for the *visual* vote; its original export and
technical score remain unchanged. Across all three pairs, both lanterns
visibly met all four task-specific criteria. The judges preferred the plugin's
first two lanterns but unanimously preferred the baseline in repeat 2. The
repeat comparison therefore failed the visual non-regression gate, despite
passing the technical comparison. Build time across the three lantern pairs
averaged about 5.4 minutes for the baseline and 5.5 for the plugin.

The press baseline had 115 invalid geometry elements and included a 200-meter
studio ground mesh in an asset limited to three meters. That ground filled the
standard camera views. For the *visual* comparison only, we rerendered the saved
baseline scene with `Studio ground` hidden, using the same neutral six-view
renderer and settings as the plugin asset. The original exported asset and its
technical score were left untouched. The judges preferred the plugin press
3–0; both assets showed the required parts, while the plugin more clearly
connected the lever to the ram. The plugin's first press build also exceeded
the triangle limit and contained collapsed bevel geometry. Its agent found and
repaired those defects before delivery.

The drawbridge baseline had 192 invalid geometry elements, included the same
200-meter studio ground in an asset limited to four meters, and had no smooth
polygons where the finish called for them. For its *visual* comparison, we hid
`Studio ground` in the saved baseline scene and rerendered both the six-view
sheet and three animation frames. We left the original export and technical
result untouched. Judges preferred the plugin drawbridge 3–0. All three saw its
hinge and cable attachments more clearly; none judged the baseline's cables
to meet the task criterion. Still images cannot verify continuous motion or
the absence of flicker.

The three lantern generations used about 1.92 million / 3.20 million reported
total tokens; the press used about 436,000 / 1,534,000, and the drawbridge
about 578,000 / 1,662,000, baseline / skills. These totals include
cached inputs and are usage proxies, not dollar costs. The plugin condition
used more reported tokens in every pair. Its build time varied by task and run.

## Controls and limits

- Generator effort was medium for both conditions in each pair. Blender was
  5.2.2 LTS (`d13f752e3b9c`) and Codex CLI was `0.155.0-alpha.9.2`.
- The source plugin fingerprint was
  `fd73795a211744fff6462d9ed0b38296bb8b9c01e44ad7ca5a6f3a232b7deec7`;
  the shared evaluator fingerprint was
  `07a858a97099d561a6161b825aaac0de8fc8e1cc84a73194cbb121bb97cee695`.
  The task, permission, and Blender controls matched within each pair.
- The lantern had a 20-minute generation limit; the press and drawbridge had 25 minutes.
  Every run used a fresh task directory. We kept the original run summaries and
  images locally under `.tmp/quality-study-2026-09-23`, outside Git.
- Three judges evaluating one pair are three opinions about the *same two
  assets*, not three independent generations. Even with three lantern pairs,
  this five-pair sample does not estimate a win rate for arbitrary prompts,
  models, or art styles. Automated gates cannot replace visual review.
- The first lantern repeat, press, and drawbridge visual votes describe the
  geometry with their oversized baseline floors hidden. All three unmodified
  baseline exports remain delivery failures.

The [earlier four-task comparison](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/validated-results.md)
also favored the plugin's final runs, while its integrated gauntlet did not
establish a clean win. Comparisons *between plugin revisions* have shown both
gains and regressions; see [quality development](quality-development.md).
Those campaigns used different models, judges, and evaluator versions, so we
keep their votes and scores separate from the samples above.

See the [benchmark methodology](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md)
for the condition definitions, visual rubric, and limits of deterministic
scoring. A broader claim needs repeated generations across more task types and
held-out prompts under the same controls.
