---
name: blender-iterative-refinement
description: Run an opt-in evidence-backed second pass on a complete Blender deliverable. Use when the user explicitly asks to critique, improve, repair, iterate, or apply a practice-makes-perfect loop; when a benchmark fixture explicitly requires retained before-and-after evidence; or when a completed candidate must be improved without regressing its existing technical or visible qualities.
---

# Blender Iterative Refinement

Start from a complete candidate produced by the relevant creation workflows.
Do not replace their normal construction stages. This skill adds a bounded
critic, source repair, identical recheck, and rollback decision.

## Freeze the candidate

1. Turn the user-visible request into critical requirements, other visible
   requirements, technical gates, and explicit exclusions.
2. Record invariants the repair must preserve: scale, aggregate world bounds,
   orientation, names, hierarchy, animation range, materials, approved forms,
   editable systems, and export behavior.
3. Preserve the candidate source, authored artifact, fresh export import,
   metrics, hero view, fixed multiview contact sheet, and required animation or
   deformation frames. Never overwrite the only copy of the candidate.

## Run a separate critic pass

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

## Repair durable source

Identify the smallest source-level cause that can address the highest-priority
failure. Make one targeted repair, or one tightly coupled repair group, in the
durable Python or editable Blender source. Regenerate the authored and exported
artifacts; do not hand-patch derived files.

If the primary subject or causal layout is wrong, a narrow cosmetic edit is
not sufficient. Rebuild that primary portion before spending effort on polish.

## Recheck and decide

Repeat the exact Blender executable, inspector, cameras, frames, render
settings, export/import path, and task gates. Compare candidate and repair side
by side. Retain the repair only when:

- the targeted failure improves or passes;
- every critical visible requirement passes in actual final evidence;
- no previous hard gate, task limit, or critical requirement regresses;
- aggregate `scene.bounds.dimensions`, not only the largest mesh, satisfies any
  global size limit;
- any deliberate tradeoff was accepted by the user.

Otherwise restore the preserved candidate and report why the repair was
rejected. A second pass is valuable only when evidence shows that the retained
result is better.

## Record the iteration

Write `iteration_review.json` with the contract, candidate evidence paths,
requirement ledger, selected defect, source cause, repair, invariant results,
final evidence paths, and `decision` of `retain_repair`, `retain_candidate`, or
`blocked`. Keep creator self-review separate from benchmark judging: do not
expose hidden thresholds, condition labels, competing submissions, or judge
feedback to the creator.
