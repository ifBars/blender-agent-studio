# Compact face specification

Use this as a record alongside editable artwork, not as a mandatory runtime
schema. Omit irrelevant fields; keep per-face content separate from shared
style/layout tokens. Paths should be portable within the asset package.

```yaml
id: workshop_hours
purpose: identify the workshop and communicate opening hours
content_mode: static
copy:
  heading: Workshop
  supporting: Open daily 10–18
  language: en
symbol: none
surface:
  kind: printed_plate
  readable_sides: front
  usable_width_m: 0.60
  usable_height_m: 0.30
  mount: wall_standoffs
view:
  distance_m: 2
  approach: front_and_oblique
  lighting: scene_daylight
readability:
  required_at_2m: [heading, supporting]
  limiting_line: supporting
  layout_trial: evidence/workshop_hours-layouts.png
  selection_reason: supporting copy remains clear without competing with heading
  evidence: evidence/workshop_hours-viewer.png
  # Record measured projected glyph height and the visual finding after review.
art:
  master: graphics/workshop_hours.svg
  output: textures/workshop_hours.png
  size_px: [1024, 512]
  alpha: false
  style_record: graphics/style.md
rights_record: graphics/sources.md
evidence:
  flat: evidence/workshop_hours-flat.png
  context: evidence/workshop_hours-viewer.png
  detail: evidence/workshop_hours-oblique.png
```

The dimensions and resolution above are an example, not a preset. Record actual
font files, weight/size roles, spacing, palette and icon sources in the style
and rights records. If live content is required, specify the text/data update
owner and integration separately; a generated PNG does not implement it.

Before delivering a family, exercise the workflow with its longest copy,
smallest intended face, most dense content and any required alternate script.
When evaluating whether this skill generalizes, compare contrasting briefs
such as a warm hand-painted shop sign, a restrained gallery caption and a
technical equipment label. Their appearance should follow their references;
shared workflow does not imply shared typography, palette, border or layout.
