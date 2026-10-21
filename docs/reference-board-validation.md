# Reference-board validation

The reference-board helper was developed during a 2026-10-21 character modeling
campaign with Codex and Claude Code Opus 5.5. It fills a setup gap between a
multiview reference sheet and the existing camera-fit and comparison tools.
It is a bounded Blender command-line helper, not a new arbitrary-Python MCP
entry point or an automatic reconstruction service.

## Contract

`setup_reference_board.py` accepts a manifest containing one to eight explicit
front, back, left or right views. Crop bounds, world centre and vertical span
come from the caller. The helper creates named orthographic cameras and image
empties in a new `.blend`, preserving the source, active camera and render
settings. Reference PNG crops are copied without changing their decoded pixels,
packed into the output and recorded with source/crop/packed-byte hashes.

View names describe the camera's world position. For a character facing -Y,
an image-left-facing profile uses the `right` view, whose camera stands on +X.
Camera orientation is not inferred from a label printed on a generated sheet.
The image's declared physical dimensions and the camera's frame agree when the
render aspect matches the crop aspect. Existing render settings are preserved.

The helper refuses existing output/evidence paths and conflicting scene names.
It bounds image dimensions, PNG/EXIF/manifest sizes, view count, crop size and
numeric values. PNGs with nontrivial EXIF rotation or flip requests are rejected;
resolution-only EXIF and normal Orientation 1 are accepted. These checks do not
calibrate photographs or establish anatomical accuracy.

## Executed checks

Nine focused tests cover manifest and path validation, nonfinite values, crops,
EXIF orientation, camera bases, physical guide size and a live Blender round
trip. The live fixture uses distinct RGB and RGBA pixel patterns, including
partial alpha, to detect crop offsets and flips. It reopens a moved `.blend`
while the external crop directory is unavailable, then verifies the packed
pixel values and hashes. It also checks source hashes, active camera, render
settings, refusal to overwrite an output and refusal of existing object names.

The complete standalone Python run executed 47 tests: 35 passed and 12
Blender-Python-only construction cases were skipped. The new subprocess-based
live Blender test ran and passed. Those older construction helpers did not
change in this follow-up; their earlier live-wrapper results remain recorded
in [character workflow validation](character-workflow-validation.md).

## Actual modeling exercise

The generated original-human sheet is 1536 by 1024 pixels. Its front, profile
and back crops are respectively 440 by 920, 330 by 920 and 400 by 920 pixels.
The helper successfully created and packed all three guides in Blender 5.2.2
LTS. The existing comparison script rendered their authored cameras. The
generated three-quarter view was retained for volume review rather than
misrepresented as another axis-aligned view.

The sheet is an invented design, not calibrated observation of a real person.
Its profile arm pose differs from the front. Review therefore separates pose,
registration and shape differences; no automatic foreground threshold or
silhouette score is used as an overall quality verdict.

The exercise exposed short forearms, forward hand placement, a waist gap,
shoe-upper/sole separation, a hip deformation from a coordinate-based arm mask,
and excessive uniformity in hair volume. The first five defects were repaired
and rechecked in complementary views. Hair and facial likeness remain a
separate visual acceptance question. The construction guide now emphasizes
rest-space region membership, evaluated-surface detail placement and opaque
silhouette review alongside shaded close-ups.

The campaign also reconstructs classic Jonesy and default Luna Snow from
opened character references, using separately adapted CC0 anatomical topology.
The MakeHuman asset license is distinct from its application's code license;
numeric mesh/target assets were used without copying application code. Source
revision, license and reference provenance are retained with the local work.
No third-party meshes, copyrighted reference images, generated models or
renders are added to Git.

These are iterative authored trials, not a controlled before/after benchmark.
Reference access, source topology and hands-on revision differ from earlier
primitive-based generations. They cannot isolate a skill effect or establish
reliable 1:1 character likeness. Local sources, revisions and image evidence
are retained under campaign ID `pr31-likeness-multiview-20261021`.
