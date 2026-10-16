# Surface integration and review

## Measured layout trial

Resolve the face as communication before adding cosmetic detail. Use this short
trial for new text-heavy designs or a sign whose typography is underperforming:

1. Mark the usable face inside the frame, then allocate text bands from the
   required reading order. Reserve a clear edge margin; do not spend the
   remaining width on repeated inset borders or decorative dividers by default.
2. Measure each string with the actual font. Fit its visible bounds into its
   assigned band using a bounded size search, including descenders and accents.
   Report occupied width and visible glyph height. Do not use one arbitrary
   font size for every string or horizontally stretch type. Maximum fit is a
   diagnostic upper bound, not a requirement to fill every band.
3. Produce two or three flat candidates using the same copy and usable area:
   the intended composition, a stronger type-led option, and (when useful) a
   different line-break/alignment option. Vary the limiting line's size/weight
   enough to see the difference. Set illustration scale only after the text
   bands work. Avoid adding containers around short lines merely to fill space.
4. Compare at the projected face size, not just the full texture resolution.
   Choose the candidate where required copy reads most comfortably while the
   heading remains dominant and the brief's character survives. Sparse labels
   still need deliberate whitespace; dense information needs explicit grouping.
   Record why the chosen candidate beats the alternatives. This can be a small
   contact sheet and a few sentences, not a long design exercise.
5. Render that candidate on the actual material. Check the smallest required
   line's strokes as well as its height: thin elegant fonts can vanish despite
   passing the height estimate. Increase weight or use a more robust face before
   increasing emission or sharpening. Repair once and compare the same view.

When refining an existing sign, preserve its good text sizes and usable width
as a floor unless a changed reading task justifies a reduction. Keep its
recognizable proportions and material character. An ornamental improvement is
not a successful revision if the name, instruction, hours or other required
information becomes harder to read. Do not copy a reference's palette or layout
to satisfy this gate; compare communication and craft independently of style.

## View-distance sizing pass

Assign each required line a reading task and distance before finalizing the
graphic. A shop name must attract recognition; its opening hours still need to
be read from the intended approach. A gallery's descriptive paragraph may have
a closer reading distance than its title. Use the brief or scene context for
that distinction rather than silently treating inconvenient copy as decorative.

Estimate the sign's projected pixel size in the intended camera at delivery
resolution. For a flat face, projected glyph height is approximately the
projected face height multiplied by the glyph's height divided by the graphic
canvas height. Measure actual cap height for uppercase text and x-height for
mixed-case body copy; nominal font point size is not the visible glyph height.
Oblique views need a rendered check because perspective changes the scale
across the face. Record the limiting view and the smallest required line.

As a diagnostic starting point for ordinary screen-delivered scenes, required
body text around 16–24 pixels of visible glyph height is worth testing; fine
serifs, weak contrast, motion or compression can demand more. This is a rough
preview heuristic, not an accessibility, safety-signage or print standard, and
does not override an explicit brief. If no reference or target is available,
make a small actual-size type sample with a few sizes/weights and compare it
under the intended material and light rather than choosing from point size alone.

Review the final render at 100% delivery size and the intended viewing distance:
can each required line be read comfortably, including punctuation and numbers?
If not, rebalance the graphic before polishing it. Reduce an oversized motif,
unnecessary divider or excessive empty margin; use useful line breaks; increase
the weak line's size or weight while keeping the main heading dominant. Shorten
or omit copy only when the brief permits it. If the complete message cannot fit
legibly, change the allowed sign dimensions or explicitly report the conflict.

Use the same camera, exposure, output dimensions and crop when comparing a
revision. Check that cleaner illustration or more whitespace did not reduce
previously readable information. A larger texture can improve edge quality but
cannot increase the number of screen pixels occupied by a physically small line.

## Fit the graphic to its carrier

Author a dedicated face region with explicit UVs. Match its usable aspect ratio
to the artwork; exclude the rim or masked edges from that area. When a texture
must be padded for an atlas or target format, map only the authored content
rectangle. Do not stretch type to fit the mesh. Use padding around atlas islands
to avoid neighboring graphics bleeding through at lower mip levels.

For a planar sign, a face quad or thin inset surface is usually sufficient.
Place it clearly above its backing, with a scale-appropriate separation that
prevents z-fighting without looking detached. Inspect depth at an oblique angle.
For curved packaging, painted graphics or decals, use surface-conforming UVs
or geometry and review distortion; the planar method is not a universal decal
solution. Avoid coplanar layers and unintended transparent sorting.

Build reverse faces with their own outward orientation and readable UVs.
Mirroring the front can reverse text or directional meaning. Check arrows from
each viewer's approach and use distinct rear artwork where the message changes.

Construct supports that fit the brief: adhesive edges, screws, brackets, posts,
chains, wall standoffs, a frame or a simple painted substrate. Use thickness,
bevels and recesses appropriate to the material and view distance. Check actual
attachment to the wall/ceiling/object and clearance around useful scene features.
Do not add hardware merely to satisfy a checklist when the object is painted,
paper, flush-mounted or intentionally temporary.

## Choose the material by function

| Surface | Starting behavior | Review question |
| --- | --- | --- |
| Printed or painted face | Lit base color, suitable roughness, normally no emission | Does it read under the intended light without looking luminous? |
| Backlit panel | Texture-driven color and restrained emission with a physical case | Is text readable without washed-out color or bloom? |
| Electronic display | Display-appropriate emission or target-engine unlit shading | Does brightness survive the scene exposure and target import? |
| Engraved or raised text | Geometry or baked surface relief when appropriate | Does depth and shadow carry the lettering at the intended distance? |

Treat color artwork as color data and masks/normal/roughness maps as non-color
data. Record color management/exposure in evidence so flat PNG colors and a
scene render are not mistaken for directly equivalent results. Use portable
material features for the requested export and verify them after import;
Blender-only node networks and engine-specific unlit settings are not assumed
to survive interchange. Keep the carrier's material independent of the face.

For an engine delivery, verify its actual importer: texture cap, compression,
color interpretation, mipmaps, filtering, wrap and anisotropy affect thin text.
Clamp isolated faces; use suitable padding for atlases. Review at oblique angles
and, for interactive scenes, during camera movement. Do not disable mipmaps or
apply a negative mip bias globally to make one still look sharper; check shimmer
and memory cost before keeping such changes. These are target settings, not
promises made by Blender's viewport or a GLB file.

## Diagnose the failing layer

| Visible problem | Investigate before changing geometry |
| --- | --- |
| Copy clipped or crowded in the flat image | Glyph bounds, line breaks, padding, longest content |
| Clear face image but blurry scene text | Projected pixel size, texture cap, UV scale, filtering, compression, focus and antialiasing |
| Stretched lettering | Usable face aspect ratio and UV content rectangle |
| Text backwards or arrow misleading | Face winding, UV direction, viewer approach and rear-side content |
| Face dim, washed out or glowing | Surface role, scene lighting/exposure, emission, color handling and importer |
| Flickering or floating artwork | Coplanar layers, face offset, recess and frame occlusion |
| Sharp close-up but unreadable from the intended position | Information hierarchy, letter size/weight, contrast and physical placement |
| Good front view but implausible sign | Back finish, substrate thickness, mounts and support contacts |

Keep fixed cameras and resolution for before/after judgments. Review the whole
family in context for competing focal points, repeated clutter and inconsistent
symbol usage. Preserve world layout, interactions and visibility where the task
only authorizes a graphic replacement. A static schedule, menu or status panel
is set dressing until a real data/update path is implemented.
