---
title: Skills
description: One router skill and eleven specialists. The agent loads only the ones a request needs.
---

The router skill, `blender-agent-studio`, reads the request and picks the smallest set of specialists that covers it. A typical asset request uses **modeling** and **validation**; the others join when the work calls for them.

## Specialists

| Skill | Use it for |
| --- | --- |
| [`blender-art-direction-intake`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-art-direction-intake/SKILL.md) | Clarifying an ambiguous brief, with an optional concept mockup. |
| [`blender-modeling-workflow`](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-modeling-workflow/SKILL.md) | Building or substantially refining a model from Python. |
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

The repository's comparison queue runs one generation at a time. On Windows it
caps the modeling process tree at 20% CPU with Below Normal priority and requests
two Blender threads, preferring a verified GPU backend for rendering. Shared
resource instructions apply equally to both conditions. Modeling and export
still use the CPU; resource limits and interruptions are recorded with results.

## Shared guidance

Every specialist bundles the same [execution guidance](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/references/astra-workflow.md), so behavior stays consistent:

- Decide routine details from context and state the defaults. Ask only when interpretations would change the subject, style, motion, or deliverable.
- Gather and inspect real references for new subjects before detailed modeling.
- Finish with clean-source reproduction, fresh-import checks where exports apply, and opened visual evidence.
