# Astra workflow adaptation

Apply this guidance with the domain skill's actual geometry, render, animation,
simulation, and export gates. It also works with Sol, Terra, and Luna. A skill
does not select the model or change the user's Codex settings.

## Complete the requested result

Infer routine choices from the request, references, and existing scene. Record
reasonable defaults briefly and continue through the requested deliverables.
Ask only when an unresolved choice would cause substantial rework and no
reasonable default follows from context. Continue independent work while the
answer is pending. Do not turn the contract, optional concept art, or an
internal stage review into an approval gate. Respect gates the user requested.
Explicit user instructions take precedence over skill guidelines. If a skill
would force a pause, quote and link the specific instruction and explain why
existing authorization does not cover the next step.

## Reason across the whole asset

Before detailed construction, connect the visual brief to a small set of
spatial and functional invariants: dimensions, proportions, contact points,
negative spaces, joint axes, material boundaries, and required motion states.
Choose a construction method that satisfies those relationships together.
Use procedural code, editable scene data, or available live Blender tools as
appropriate; keep durable source and reproducible outputs.

Treat the seven modeling stages as quality milestones. Adjacent stages may
share a build and evidence pass when their exit criteria are observable.
Never skip proportion review, hide unresolved structure with materials, or
reduce the finish target to save steps. For a local repair, revisit affected
milestones rather than rebuilding already accepted work.

Before polishing a hero view, map the requested deliverable's review coverage:
primary subject, secondary functional zones, reverse sides, broad surfaces and
top/underside where inspectable. Spread the finish work across that scope before
adding detail to the focal object. A complete asset or environment must not have
a dressed hero area surrounded by primitive or blank construction. An explicitly
interior-only/render-only brief does not require inventing an unseen exterior;
an inspectable whole-asset brief does require its promised multiview finish.

## Spend tool time on evidence that changes the next decision

Make the asset handoff visually useful by default: show a polished hero image
with readable material colors, controlled highlights, and a contrasting studio
background. Use the renderer's automatic preset as a starting point and adapt
after opening the image; provide two labeled looks only when both serve a useful
purpose. Keep fixed diagnostic views alongside it. Pin a common preset for
benchmark comparisons, where per-candidate adaptation would confound results.

For photorealistic scenes, use authored cameras/lighting and suitable scanned
materials or HDRIs. The rendering skill includes Poly Haven search/download
tools and material setup guidance. Keep important modeling work authored, but
do not equate originality with rebuilding every texture from procedural noise.
Inspect material close-ups, record sourced assets, and preserve render-only
deliverables without forcing an irrelevant GLB export.

- During construction, run the relevant numerical checks and low-cost views
  after a coherent change. Inspect the whole contact sheet, then open original
  individual views or detail views for ambiguous joints, seams, or materials.
- Tie a visible defect to its view/frame and a source-level cause. Compare
  several plausible causes before editing; change the cause best supported by
  the evidence. Use `unclear` when the image cannot establish a relationship.
- Trigger fresh export/import checks early for export-sensitive changes:
  topology, modifiers, transforms, hierarchy, skinning, materials, or actions.
  At completion, always reproduce the final source in a clean process and run
  the domain's full applicable authored/exported and visual gates.
- Once appropriate checks pass, deliver. Repeat them only after relevant
  changes, failures, or a specific unresolved concern. A separate agent critic
  is optional; a distinct self-critique pass is sufficient unless the user or
  evaluation protocol requests independence.

## Preserve continuity during long work

For multistage or interrupted work, keep a concise `work_state.md` beside the
source: current brief and assumptions, accepted decisions, source revision or
hash, artifact/evidence paths for that revision, known defects, pending tool
jobs, and next action. Update it at meaningful checkpoints, not every call.
On resume, verify files and job state before building on the checkpoint.

When the user steers the task, preserve completed applicable work, update the
brief, and invalidate only affected evidence or caches. Answer side questions
briefly and continue the broader request unless the user cancels it.

Where the host supports nonblocking tools, overlap independent inspection,
documentation, or report preparation with renders/bakes from frozen inputs.
Keep dependent steps sequential, use separate output directories, collect all
results, and avoid competing heavy GPU jobs. Never mutate a scene or cache
while a pending job consumes it. The bundled MCP is still a bounded batch
evaluator; this guidance does not add Responses API async support to it.

Use subagents only when the user or applicable instructions request delegation
and the host supports it. Assign independent work and explicit file ownership;
do not let multiple agents edit one live scene. Prefer Terra over Sol for
bounded delegated work unless explicitly directed otherwise. Keep art direction
and final acceptance with the lead agent. Do not spawn a separate Codex task
merely to obtain a second opinion.

## Model choice and evidence limits

Use the model selected by the user. For controlled runs, the benchmark's
`--profile astra` selects `gpt-6-astra` at `medium`; explicit `--reasoning`
can preserve the effort used by an existing comparison. Increase effort only
for a concrete unresolved problem or an explicitly configured experiment.
Do not silently upgrade all work to maximum effort or silently fall back to a
different model after an error.

The adaptation follows OpenAI's [Astra migration and prompting guide](https://developers.openai.com/api/docs/guides/latest-model),
checked 2026-09-04: stronger long-task coherence and instruction following,
with particular attention to unnecessary clarification and excess testing.
These motivate the workflow changes; they are not Blender-specific results.
The host's model catalog remains authoritative for available models and effort
levels. Code-mode tools, image detail, async execution, and steering depend on
the host; do not infer tool availability from the model name.

Measure old versus revised skills on the same model first. Measure Astra versus
Sol/Terra/Luna separately with fixed skills, task inputs, effort, permissions,
Blender build, evaluator, and repeated blinded visual judging. Report model
effects separately from skill effects. Keep prior results as historical
evidence; do not relabel them as Astra results or promise a quality/speed gain
without new measurements.
