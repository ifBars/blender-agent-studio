# Validated benchmark result

Date: 2026-07-24 Pacific / 2026-07-25 UTC.

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
