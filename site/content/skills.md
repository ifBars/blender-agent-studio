---
title: Skills
description: One router skill and twelve specialists. The agent loads only the ones a request needs.
---

The router skill, `blender-agent-studio`, reads the request and picks the smallest set of specialists that covers it. A typical asset request uses **modeling** and **validation**; the others join when the work calls for them.

## Specialists

| Skill | Use it for |
| --- | --- |
| [`blender-art-direction-intake`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-art-direction-intake/SKILL.md) | Clarifying an ambiguous brief, with an optional concept mockup. |
| [`blender-modeling-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/SKILL.md) | Building or substantially refining a model from Python. |
| [`blender-signage-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-signage-workflow/SKILL.md) | Editable sign and label artwork, physical carriers, materials and distance readability. |
| [`blender-asset-validation`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-asset-validation/SKILL.md) | Geometry and export checks, fresh imports, and six-view evidence. |
| [`blender-iterative-refinement`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-iterative-refinement/SKILL.md) | An opt-in critique, targeted repair, and regression check. |
| [`blender-procedural-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-procedural-workflow/SKILL.md) | Geometry Nodes, scattering, terrain, and parametric generators. |
| [`blender-rendering-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-rendering-workflow/SKILL.md) | Lighting, cameras, color management, stills, turntables, and sequences. |
| [`blender-animation-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-animation-workflow/SKILL.md) | Articulated and mechanical motion, pivots, and critical-frame review. |
| [`blender-simulation-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-simulation-workflow/SKILL.md) | Fluid, smoke, fire, cloth, rigid and soft bodies, particles, and hair. |
| [`blender-character-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-character-workflow/SKILL.md) | Character topology, rigs, skinning, facial rigs, and humanoid export. |
| [`blender-mcp-integration`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-mcp-integration/SKILL.md) | Choosing and configuring Blender MCP servers. |
| [`blender-agent-benchmark`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-agent-benchmark/SKILL.md) | Paired, isolated comparisons of agents, skills, and tools. |

## Call one directly

In Codex, prefix a request with `$blender-agent-studio:<skill>` to load specialists without routing. Combine them when a request spans several areas:

```text
$blender-agent-studio:blender-modeling-workflow $blender-agent-studio:blender-animation-workflow Build a drawbridge whose deck raises on a winch.
```

In Claude Code, invoke a specialist with `/blender-agent-studio:<skill>`:

```text
/blender-agent-studio:blender-animation-workflow Animate the drawbridge deck raising on a winch.
```

Both hosts can also select skills from a plain request. They load the same specialist guidance and MCP tools.

For review-only work, use `blender-asset-validation` on its own.

The modeling workflow includes a [pole-safe lathe helper](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/scripts/lathe_mesh.py)
for bowls, vases and turned hardware. It shares radius-zero pole vertices;
evaluate modifiers and inspect a representative before repeating it through
a scene. Full-scene guidance also reviews focal-zone scale, upholstery and
broad floor reflections alongside architectural trim and material detail.

For image-based modeling, the [reference board helper](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/scripts/setup_reference_board.py)
reads a JSON manifest of up to eight front, back, left or right PNG views, each
with an optional pixel crop. It writes a new `.blend` with semi-transparent image
guides that are hidden from renders, plus a matching orthographic camera for
each view. Each guide's size comes from its declared height and the crop's
aspect ratio. View names give the camera position; for a subject facing -Y, a
profile with the nose pointing left is `right`. The helper checks every input
before it changes anything. It never overwrites the input file, the output or
the reference images, and it leaves render settings and the active camera
unchanged. Crops are copied exactly into a new evidence folder and packed into
the output `.blend`, so the guides stay with the file when it is moved. A report
records hashes and the meters assumption. It does not infer orientation, scale
or proportions, and the guides do not prove that the shape matches. The
[image-to-3D guide](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/references/image-to-3d.md)
gives the manifest format and view conventions.

The repository's comparison queue runs one generation at a time. On Windows it
caps the modeling process tree at 20% CPU with Below Normal priority and requests
two Blender threads, preferring a verified GPU backend for rendering. Shared
resource instructions apply equally to both conditions. Modeling and export
still use the CPU; resource limits and interruptions are recorded with results.

## Signage and surface graphics

The signage specialist separates the graphic face from its physical carrier.
It guides measured text layout, verified glyphs and pictograms, clean raster
output, matching aspect ratios and UVs, suitable printed/backlit/display
materials, credible supports and review in authored lighting. It does not
prescribe a palette, font, industry or layout. A hand-painted shop sign,
gallery label and machine plate should retain their own visual language.

Text size is planned against its reading distance and projected glyph size
before decoration takes the available space. Review covers every required
line, including supporting copy, and compares revisions at the same output
size so cleaner graphics do not quietly sacrifice useful readability.
For text-heavy faces it compares a few measured layout options at projected
size before committing to decoration. Required text gets usable space first;
font weight, line breaks and occupied width are checked alongside glyph height.
For operational copy read on approach, a larger-text alternative tests whether
unused space can improve reading comfort. Required codes and specifications
keep their reading distance; a nicer hierarchy cannot excuse smaller useful
text. Before/after review checks each required line separately.

For example: “Build a ceramic workshop sign with a warm hand-lettered face,
readable from two meters. Save editable artwork, the Blender source and a
context render.” Copy and symbols remain editable; static display textures
are not presented as live data. The skill includes a compact face specification
and an integration guide, rather than a fixed sign generator or new MCP tool.

## Character construction

The character workflow includes a
[connected-surface construction guide](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-character-workflow/references/character-construction.md).
It develops the palm into finger roots and an opposing thumb, builds footwear
from a shared footprint and side profile, and tests joint loops and localized
weight transitions before garment detail. Local refinements preserve shared
boundaries and whole-body proportions.

Review uses palm/dorsal/edge hand views, top/profile shoe views, and bend/reach
poses when rigging is requested. The same poses are checked after export;
native volume-preserving skinning alone is not proof of portable deformation.
Optional Blender-Python upper-body and hand helpers provide editable shared-edge
starting cages, rather than intersecting shoulder caps or finger tubes. They
require proportion adaptation, intentional wrist joining, local skin weights,
garment fitting and visual pose/export review; they are not finished characters
or a guarantee of anatomical quality. Low-poly and realistic work retain their own
form and topology requirements.

The helper regressions also sample nonadjacent surface intersections, including
short thumbs and steep underarms that pass closed-manifold checks. The workflow
preserves semantic limb membership through rest subdivision, checks that an
arm raise cannot pull the waist, and verifies bone roll before posing footwear.
A grounded foot must also remain planted horizontally during stance; world-floor
and fresh-export checks stay separate from garment-clearance review.

Animated outfits distinguish rigid accessories from flexible layers. Socks,
cuffs and straps follow the appropriate local surface, while soles and rigid
details follow their intended bones. Side/rear ankle checks during foot lift,
passing and toe-off catch separation hidden in an idle pose. Intentional
cartoon proportions and mitten hands remain valid style choices.

The loop now also uses [surface attachment inspection](scene-analysis.md#deforming-character-attachments):
declare small surface patches and pose frames, measure the gaps, repair the
binding or geometry, and compare against preserved baseline evidence.
Numeric checks and visual review remain separate; a connected mesh or a
within-tolerance patch distance does not prove good character form.

The [form review guide](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-character-workflow/references/character-form-review.md)
lists the features that decide a brief: a realistic face, hair, hands and named
clothing or footwear, or a known character's identifying features. Each feature records
its acceptance basis: an opened reference, the brief or an approved design for
original work, or `unreferenced`. It then gives a matched model view, the
concrete differences and a verdict. A failed download does not count
as a reference. A realistic or likeness claim needs an accepted face. Raking
light reveals skin banding, and comparing native with fresh-export renders shows
procedural patterns that glTF drops. These gates make missing evidence visible. They do
not guarantee better generations.

## Humanoid motion and interaction IK

The benchmark's motion evidence includes perspective, side and rear sampled
poses. Export-inspected motion tasks add matching fresh-import GLB sheets to
the blinded judge input. Incomplete motion evidence prevents judging; numeric
body deformation alone cannot approve the exported outfit. Renderer version 4
also frames evaluated collection instances, including visible instances whose
source collections are excluded from the view layer. Historical results retain
their original task and renderer versions.

The animation workflow now includes a
[humanoid motion guide](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-animation-workflow/references/humanoid-motion.md)
and a [manual motion review record](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-animation-workflow/references/motion-review-template.md).
They cover weight transfer during turns, planted forefoot and heel-pivot
phases, bounded IK reach correction, grip orientation, first-person camera
checks, seat entry/exit and readable interaction gestures.

Contact measurements use independent anchors and report cumulative drift,
support-normal gaps and transition boundaries. Assessing naturalness still requires
opening and watching the motion at normal speed. First-person hands and gestures visible to other
players are separate requirements; a working private viewmodel cannot prove
the latter. Explicitly requested seat snaps are validated as gameplay choices.

Character creation, refinement and validation route into the same guide.
Native rig checks, baked exports, engine playback and multiplayer observation
remain separate evidence stages. This adds workflow guidance, not an automatic
IK solver, motion score or new MCP tool. It does not establish improvements
to a game's runtime animation without testing that game.

## Shared guidance

Every specialist bundles the same [execution guidance](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/references/astra-workflow.md), so behavior stays consistent:

- Decide routine details from context and state the defaults. Ask only when interpretations would change the subject, style, motion, or deliverable.
- Gather and inspect real references for new subjects before detailed modeling.
- Finish with clean-source reproduction, fresh-import checks where exports apply, and opened visual evidence.


## Sustained work on large scenes

Detailed environments use the modeling workflow's
[whole-scene iteration plan](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/references/whole-scene-workflow.md).
The agent plans hour-scale work when warranted, builds and reviews composition,
hero and secondary asset families, materials and lighting, and repairs concrete
defects before delivery. A short zone/family list and revision-linked
checkpoints support resuming interrupted work without losing accepted progress.

Completion requires opened hero, reverse, secondary-area and close-up evidence:
a primitive pile, decorative noise or a polished single camera is insufficient.
User time limits and requested blockout/low-poly styles still apply. The skill
cannot guarantee a host session's duration or automatically judge aesthetics;
unfinished work is reported as partial with a specific next action. This loop is
part of normal scene creation, not the opt-in second-pass refinement workflow.
