# Gallery model coverage

The comparison gallery contains one no-plugin/plugin pair for each of five
tasks and four models: GPT 6 Astra, GPT 6.1 Sol, Opus 5.5, and Sonnet 5.5.
The tasks are signal lantern, joinery stool, task lamp, lever press, and drawbridge.

The eight spatial pairs and the two earlier Astra press/drawbridge pairs are
reused. Ten new pairs fill the missing cells. Each new condition has a
12-minute generation limit and medium effort, with one attempt per condition.
Two Astra review invocations use counterbalanced image order.

Runs use Codex or Claude Code as appropriate. The plugin snapshot is the same
frozen source used in the October spatial pilot. Both conditions run with the
same permissions, Blender build, task and evaluator. Generation runs overlap,
so elapsed times are not isolated latency measurements.

## Historical lantern selection

The older **GPT 6 Sol** lantern remains a separate entry. It is not GPT 6.1 Sol.
At the gallery owner's request, run 3 replaces the three-run selector.
Both sides come from that same attempt; the selection does not combine the
best no-plugin image with the best plugin image from different attempts.

The gallery records this choice as post-hoc curation. It preserves the run-3
review result: three votes for no plugin. Runs 1 and 2 remain available in the
[previous gallery archive](https://github.com/ifBars/blender-agent-studio/releases/tag/gallery-hd-2026-10-02).
Do not use this curated entry to estimate average quality or success rates.

## Evidence and previews

HD previews retain the [1536-pixel denoised preset](gallery-previews.md).
Reviewed images, unframed submission views, technical failures, source hashes,
and per-judge answers remain available. The drawbridge viewer shows still views; visual
reviews also use sampled animation evidence when available.

The first two pairs' unframed reviews showed a presentation failure: large studio
floors hid the actual lanterns. New matrix reviews therefore use fresh
384-pixel views with explicit staging exclusions, applied to both conditions.
Those named exclusions also apply to HD previews. The original renders and
technical scores are preserved; oversized floors still fail their original
size checks. The first unframed reviews are superseded, not counted as extra votes.

The gallery combines separate historical cohorts. Model coverage is complete,
but this is not a synchronized model ranking or a broad capability claim.

## Reproduce the expansion

Use `tools/run-gallery-matrix.ts` with a fresh output directory, a frozen
`--skill-root`, and the previous `--existing-data` file. It runs only the
missing lantern, press and drawbridge pairs.

`tools/prepare-gallery-reviews.ts <runs> <fresh-review-runs> <blender>` prepares
the framed review evidence without saving the source models.
`tools/judge-gallery-matrix.ts <runs> <fresh-output> <review-runs>` reviews completed pairs.
`tools/build-gallery-matrix.ts` accepts `--existing-data`, `--runs`, `--review-runs`, `--judging`,
`--output`, and `--blender`. It verifies paired controls and source hashes,
renders previews, and refuses an incomplete model/task matrix.

The preview archive remains outside Git. The site downloads the release asset
using its pinned checksum before building.
