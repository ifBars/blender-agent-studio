# Validated benchmark result

Date: 2026-07-24 Pacific / 2026-07-25 UTC.

Historical note: this result predates inspector schema 3, scorer version 4, and
comparison schema 3, which add UV, shading, refinement, finish-profile,
category signals, structured visual criteria, and a strict non-regression gate.
Preserve it as evidence for the earlier methodology; do not compare its
100-point automated scores directly with newly generated runs.

Environment:

- Blender 5.2.0 LTS, build `fbe6228777e7`;
- Codex CLI 0.145.0;
- `gpt-5.6-terra`, medium reasoning;
- isolated baseline and plugin workspaces;
- fresh `.blend` and GLB inspection;
- clean-directory source reproduction;
- fixed six-view contact sheets and critical animation frames;
- randomized blinded visual comparison.

Paired task outcomes:

| Task | Deterministic result | Blinded visual votes |
| --- | --- | --- |
| Signal lantern smoke | both 100, both gates pass | plugin 1, baseline 0 |
| Tabletop press | both 100, both gates pass | plugin 3, baseline 0 |
| Winch drawbridge after connector-skill revision | both 100, both gates pass | plugin 3, baseline 0 |
| Foot-pump holdout | plugin 100/pass; baseline 91/fail | plugin 3, baseline 0 |

The first plugin drawbridge lost 0-3 because cable endpoints drifted from the
moving deck. A transferable local-anchor and endpoint-residual rule was added;
the unchanged baseline then lost 0-3 to the revised plugin run. The predeclared
foot-pump holdout retained the improvement.

Across final selected runs, the plugin received 10 of 10 blinded preference
votes and introduced no hard-gate regression. The plugin runs averaged about
48 percent longer because they performed their own validation and animation
evidence work.

This demonstrates an improvement for these four tasks under one model and
reasoning setting. It is not a universal claim across all prompts, models,
styles, or random variation. Preserve raw reports and add repetitions before
claiming a general population effect.

## Integrated gauntlet calibration

Date: 2026-08-09 Pacific.

One matched `gpt-5.6-terra`, medium-reasoning pair used Blender 5.2.0 LTS,
identical 45-minute limits, and three counterbalanced blinded judges. This is a
single-model calibration sample, not evidence about most models.

| Condition | Automated | Hard gate | Verified composite | Visual votes |
| --- | ---: | --- | ---: | ---: |
| no-skill baseline | 97.23 | fail | 49 | 1 |
| opt-in iterative plugin | 93.67 | fail | 49 | 2 |

Both conditions made substantial progress, comfortably above the intended 10%
foothold, but neither approached a valid perfect result. The hard-gate cap
prevented high deterministic proxy scores from saturating the benchmark. The
baseline passed 4 of 36 per-judge visual-criterion opportunities; the plugin
passed 0 of 36, while receiving the 2-1 overall preference because its broad
visual mean was slightly higher (3.317 versus 3.167). This disagreement is why
the benchmark reports requirements, broad quality, deterministic structure,
and pairwise preference separately.

Observed deterministic misses included incomplete semantic groups, fewer than
the required rigid bodies and bones, no weighted visible mesh, and—in the
plugin condition—missing constraints and a polished-smooth shading failure.
The plugin retained an explicit robot-legibility repair in
`iteration_review.json`, demonstrating that the opt-in refinement protocol ran,
but the final evidence still failed the stronger independent rubric.

During development, making iterative refinement mandatory on the historical
generator path produced a drawbridge visual regression under the strict gate.
That rollout was rejected. The shipped design restores the legacy modeling and
validation skills unchanged and loads iterative refinement only for explicit
requests and the isolated gauntlet suite.
