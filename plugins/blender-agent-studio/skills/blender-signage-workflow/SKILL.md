---
name: blender-signage-workflow
description: Create readable signs, labels, placards, graphic panels, and static display faces for Blender props and environments. Use when surface typography or pictograms need deliberate 2D design, physical integration, and distance-readability review.
---

# Signage and Surface Graphics

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Treat the graphic face and its physical carrier as separate authored assets.
Compose the face in a suitable 2D tool, then integrate it with the model and
review it in context. A board with default floating text is rarely a finished
sign. Raised lettering, engraving, painted marks, or deliberately crude signs
can be correct when the brief calls for them; preserve that intent.

## Establish the communication task

Record the exact copy, what the viewer must recognize first, physical size,
viewing distance/angle, available light, and whether content is static or live.
For a family, identify the shared layout rules and which content varies. Keep
this compact; use the [face specification](references/face-spec.md) when several
faces or downstream handoffs need a consistent record.

Inspect supplied references and relevant real examples. Extract hierarchy,
spacing, symbol language, construction and mounting observations separately
from palette and style. Choose typography, colors, geometry and wear from the
current brief. Do not default to a particular industry, modern sans-serif,
dark background, icon tile, colored stripe, or metal lightbox. A carved shop
sign, museum label and industrial machine plate can use the same workflow.

## Design the face before detailing the housing

- For a new text-heavy design, compare two or three inexpensive flat layout
  candidates before committing to the housing. Follow the
  [measured layout trial](references/surface-integration.md#measured-layout-trial).
  Make differences in line breaks, occupied width and type weight visible;
  palette swaps alone are not layout alternatives. Retain the best readable
  hierarchy and bring the illustration up to its quality, rather than letting
  illustration force the typography into leftover space.
- Establish a small typographic hierarchy and deliberate alignment grid.
  Measure actual glyph bounds and line widths; account for baselines, descenders,
  margins and frame occlusion. Resolve overflow by editing layout or agreed copy;
  do not silently shrink important text below its useful viewing size.
- Allocate readable text sizes before filling space with an illustration,
  border or generous whitespace. Classify each line as identification, required
  action/information, or optional detail and state where it must be readable.
  Supporting copy can be secondary without becoming tiny or excessively light.
  Preserve useful differences in hierarchy; do not enlarge every line equally.
  Follow the [view-distance sizing pass](references/surface-integration.md#view-distance-sizing-pass)
  when the sign contains text that the viewer needs to read.
- Use original vector pictograms or suitable licensed assets with consistent
  stroke weight, visual scale and meaning. Avoid relying on emoji or unverified
  symbol-font coverage. Check the actual font's character coverage for every
  language, including punctuation; use a renderer with appropriate shaping for
  complex scripts. Preserve font and icon provenance and redistribution terms.
- Keep exact text editable and deterministic. SVG, a layered design document,
  or a reproducible drawing script are all useful masters. Pillow-style drawing
  suits geometric graphics; vector/design tools suit intricate lettering.
  Generated imagery may inform a concept or decorative illustration, but verify
  and typeset critical copy rather than trusting generated text.
- Size the raster to its projected use, target texture budget and physical
  aspect ratio. Render vector-like graphics larger and downsample with a quality
  filter when needed for clean edges; the original implementation used 3x.
  That factor, power-of-two dimensions and any fixed resolution are choices,
  not universal rules. Use appropriate alpha only when the surface needs it.
- Open the flat face at full size and at an estimated in-scene pixel size.
  Review the longest label, densest layout and unusual glyphs before producing
  the whole family. An attractive contact sheet alone does not prove readability.
  Check every required line, not just the heading. If important copy is weak,
  first reclaim space from decoration and oversized margins, then adjust line
  breaks, type size/weight and contrast. Do not substitute a closer camera,
  sharper texture or higher render resolution for an appropriately sized layout.

## Integrate with the physical asset

Follow [surface integration and review](references/surface-integration.md) for
UVs, material roles, supports, export and diagnosis. Use the modeling workflow
for the carrier's geometry; this skill adds the graphic-specific decisions.

Keep content/layout generation separate from the housing build. Pass image
paths, face dimensions and material roles explicitly so copy changes do not
require reconstructing unrelated scene geometry. When replacing existing
signs, preserve user-authored placements and gameplay behavior; rebuild only
the owned objects and keep a recoverable baseline.

## Acceptance and delivery

Inspect the finished flat graphic, an oblique close view of the physical sign,
and intended viewer-distance views in authored lighting. Include the reverse
side when readable from both directions. Check required text and symbols at
delivery resolution, not only a zoomed crop. Fix source, regenerate affected
faces and repeat the affected views. Track visual defects separately from
technical checks; no automated aesthetic score establishes success.

Deliver editable graphic source, copy/style inputs, font/icon rights records,
generated textures, reproducible geometry source and the requested scene or
export. Pack or resolve dependencies and inspect a fresh export when applicable.
Keep static display content clearly identified as static. Do not claim live
data, localization, engine readability or performance without implementing and
checking those separately.
