# Experimental assembly verification loop

Before constructing details, describe the assembly as a small relationship map:
which surfaces must touch, which must remain separated, where support comes
from, and which openings are intentional. Keep scale and joint axes explicit.
Derive connected part endpoints from shared parameters rather than independent
guessed positions. A visually closed assembly can contain separate meshes;
joining mesh objects alone does not close a geometric gap.

Save the first complete candidate before repairing it. Use the pinned plugin's
SceneIR implementation in `scripts/scene-analysis.ts`: a small Bun script can
import `describeAsset` and call it with `assetPath`, `blenderPath`, `timeoutMs`,
`outputJson`, and `options`. Start with empty options to learn exact object IDs,
then supply task-grounded `contact_pairs`, `ground_z`, `ground_objects` and
`tolerance`. Inspect the returned evidence. Separated bounding boxes can prove
a gap; overlapping boxes cannot prove either surface contact or penetration.
Do not treat `contact_unverified` or `review_required` as passes. For rotated,
curved or hollow parts, inspect actual surfaces and corroborate with images.

Render and OPEN both whole-asset views and close views of ambiguous joints.
Use the pinned `skills/blender-asset-validation/scripts/render_evidence.py`
with a fixed `--presentation neutral`, initially at resolution 256. It accepts
`--views perspective,front,back,left,right,top,bottom` and `--focus-objects`
as a JSON array of exact mesh names. Focusing changes framing without hiding
other parts. Bottom views hide only the generated studio floor. An authored
floor may still occlude them; record that limitation instead of inferring
contact through it. Use individual full-size images when a sheet is unclear.

For each suspected defect, record the view, the relationship that fails, the
source cause and confidence. Check multiple possible causes before changing
the geometry. Repair the shared dimensions, endpoints, transforms or surface
construction responsible. Preserve intended openings, proportions, materials,
and unaffected detail. Do not fix floating geometry by simply sinking all
objects into one another. Rebuild and compare the same views and checks after
the repair. Stop when the relevant relationships are supported by evidence or
the run budget is reached; report unresolved cases honestly.

Keep `spatial_review.json` with relationships, evidence paths, findings,
repairs and remaining uncertainties. It is a process record, not a quality
score. Reproduce the final source and inspect the exported asset as required
by the base workflow. Reserve time for export and the final report.
