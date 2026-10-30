---
name: blender-iterative-refinement
description: Critique and refine Blender props, assemblies, and scenes against accepted references with evidence-backed source repairs. Use during normal creation when a candidate falls short of the requested finish, when the user asks to improve or iterate, or when a benchmark requires retained before-and-after evidence. Review individual asset families before accepting the whole scene.
---

# Blender Iterative Refinement

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Use this loop during normal creation as well as explicit refinement requests.
Start when a prop or assembly has enough form to compare against its intended
result; do not wait for a complete scene or a user prompt to refine it. Preserve
the creation workflow's stages and requested style. Review-only requests remain
read-only; explicit blockout requests do not authorize a finished-asset pass.

## Choose the review unit and finish target

Review one semantic prop or functional assembly at a time: for example, an
espresso machine with its controls and brewing hardware, then the grinder,
cup, and pastry. Do not review every Blender mesh separately when those meshes
form one object. For repeated assets, finish one representative per distinct
family before replication, then inspect instances whose placement or variation
can introduce failures. Review supports and neighbors together when the defect
is a relationship between them.

Use the accepted concept, supplied references and approved existing assets to
set the finish target. Record concrete comparisons: silhouette and proportions,
functional openings and negative space, construction and contact, material
separation, and the intended level of detail. Recognizable identity or a valid
export is insufficient when the reference has materially stronger construction.
Use real references to resolve ambiguous mechanics without discarding the
accepted stylization. Reuse established references for local repairs.

Open both an isolated close view that resolves the construction and a context
view at the intended viewing distance in authored lighting. A wide scene view
cannot clear a defect too small to inspect; an isolated beauty render cannot
prove fit, scale, access or readability in the scene. Increase evidence detail
when needed, without inventing microdetail requirements for distant props.

Keep a compact per-family queue in the existing work record: finish reference,
current defect, evidence view, source cause, next repair, and pass/fail/unclear.
Finish the current unit's important defects before moving to another, except
when a shared helper or integration dependency must be repaired first. Inspect
every distinct promised family before accepting the scene; hero quality cannot
stand in for secondary props.

## Freeze the candidate

1. Turn the user-visible request into critical requirements, other visible
   requirements, technical gates, and explicit exclusions.
2. Record invariants the repair must preserve: scale, aggregate world bounds,
   orientation, names, hierarchy, animation range, materials, approved forms,
   editable systems, and export behavior.
3. Preserve the candidate source, authored artifact and fixed evidence views
   needed for this review. Retain metrics, fresh export imports and animation
   frames when applicable to the changed behavior or benchmark protocol.
   Never overwrite the only copy of the candidate. A local prop repair need
   not render or export the whole scene on every iteration.

## Run a separate critic pass

Separate critique from editing: freeze the candidate and judge its evidence
before choosing a repair. This can be a distinct self-review pass; it does not
require a second agent unless the user or benchmark protocol asks for one.

Open the preserved images with an image-viewing tool. Before editing, write a
`pass`, `fail`, or `unclear` ledger for every critical requirement and cite the
view or frame that proves the judgment. Names, source code, hierarchy, and
metrics cannot make an absent, occluded, or unreadable subject a visual pass.

Treat transmissive enclosures and emissive subjects as a coupled visibility
problem. Inspect the actual target render engine and exposure: a valid shader
graph is not enough when glass becomes opaque or emission blooms into a white
blob. The enclosed subject must retain a traceable silhouette and local color
contrast in every required view and animation sample.

Prioritize in this order:

1. missing or unreadable primary subject, required operation, or critical
   relationship;
2. failed deterministic gate or aggregate task limit;
3. severe geometry, deformation, contact, material, lighting, or export defect;
4. secondary polish.

For a visible mechanism, trace the whole causal chain across critical frames:
driver, connector, attachment, pivot or guide, moving part, and final state.
Thin, occluded, or low-contrast connections are `unclear`, even when numerical
endpoint residuals pass.

When available, retain `blender_quality_report` output for candidate and repair
using identical selection and explicit constraints. Then call
`blender_compare_scenes` with the preserved candidate as baseline. Declare
required parts and invariants from the frozen contract; use `invariantObjects`
when the repaired part is intentionally allowed to move or change dimensions.
Its errors cover the full selected assembly even if object results are paginated.
Keep numeric findings and factual diffs separate from the visual ledger:
`review_required` is not a pass, and bounds overlap alone cannot prove a mesh
intersection. Compare actual evidence before retaining a repair; no aesthetic
score or automatic checkpoint tool is implied.

For character repairs, keep separate ledger rows for hand/thumb construction,
shoe footprint/profile, shoulder/underarm continuity, joint deformation, and
clothing/accessory attachment. A single connected body or exported action
cannot pass these rows. Preserve intended cartoon proportions and simplified
hands. Use `blender_inspect_attachments` for explicit deforming surface pairs
where supported. Preserve selectors when topology is unchanged; after topology
changes, rebind and visually verify the new patches before rechecking. Keep
thresholds and frames fixed, and report that changed bindings require review
rather than claiming an identical numerical comparison. Review the
worst frame and surrounding views after the weight/geometry repair; a passing
centroid distance can still conceal penetration or a visibly detached shoulder.

## Repair durable source

For humanoid motion, use the animation workflow's
[motion review record](../blender-animation-workflow/references/motion-review-template.md).
Keep contact accuracy, naturalness, first-person framing and third-person
readability in separate rows. Preserve the requested action when repairing
robotic motion: removing steps and returning to a stiff swivel is not a fix.
Compare the same full-speed sequence, contact intervals and blend boundaries;
reject a visually worse revision even when its contact residuals improve.

For reference-based character revisions, use the character workflow's
[likeness refinement protocol](../blender-character-workflow/references/likeness-refinement.md).
Preserve calibrated body views and head-only snapshots before changing shape.
The validation skill's `scripts/review_likeness.py` rejects changed comparison
conditions and reports per-view landmark/proportion deltas; its numerical
targets never replace the visual ledger or authorize retaining a regression.

Identify the smallest source-level cause that can address the highest-priority
failure. Make one targeted repair, or one tightly coupled repair group, in the
durable Python or editable Blender source. Regenerate affected artifacts;
recheck exports when the repair affects the requested exported result. Do not
hand-patch derived files.

If the primary subject or causal layout is wrong, a narrow cosmetic edit is
not sufficient. Rebuild that primary portion before spending effort on polish.

## Recheck and decide

Repeat the relevant checks with the same Blender executable, inspector,
cameras, frames, and render settings, including the export/import path when
applicable. Compare candidate and repair side by side. For lighting or camera
repairs, keep an unchanged diagnostic view and record the intentional setting
change. Retain an intermediate repair only when:

- the targeted failure improves or passes;
- previously passing critical requirements remain passing, and unresolved
  requirements remain explicitly open;
- no previous hard gate, task limit, or critical requirement regresses;
- aggregate `scene.bounds.dimensions`, not only the largest mesh, satisfies any
  global size limit;
- any deliberate tradeoff was accepted by the user.

Otherwise restore the preserved candidate and report why the repair was
rejected. Retaining an improvement does not mean the unit is finished. Reopen
the same close and context views, carry forward every remaining fail/unclear
item, and repair the next important defect. Clear an item only with fresh
evidence for the current source revision; added detail, a successful export,
or moving to another prop cannot clear it.

Stop when the unit meets the accepted finish target and all critical visible
requirements pass, then review its integration and continue the family queue.
Do not impose a fixed number of polish passes or keep editing accepted work
without a concrete defect. When repeated edits do not improve a defect,
reconsider the construction method or reference interpretation. Honor user
time limits and approval gates; if progress is blocked, preserve a partial
checkpoint with the unresolved defect and next action rather than claim finish.

## Record the iteration

For ordinary creation, keep the queue and repair decisions in the existing
`work_state.md` rather than creating a second tracking system. Record the source
revision, before/after evidence, retained/reverted repair and unresolved items.
Run the creation workflow's full applicable completion gates at final delivery.

For a benchmark or a requested formal iteration record, write
`iteration_review.json` with the contract, candidate evidence paths,
requirement ledger, selected defect, source cause, repair, invariant results,
final evidence paths, and `decision` of `retain_repair`, `retain_candidate`, or
`blocked`. Keep creator self-review separate from benchmark judging: do not
expose hidden thresholds, condition labels, competing submissions, or judge
feedback to the creator.
