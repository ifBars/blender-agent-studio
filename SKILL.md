---
name: blender-agent-studio
description: Route Blender asset creation, refinement, validation, animation, MCP integration, and agent benchmarking work to the appropriate Blender Agent Studio workflow. Use when an agent needs an end-to-end Blender workflow or when the correct modeling, validation, animation, MCP, or benchmark skill is not yet known.
---

# Blender Agent Studio

Select the smallest set of specialist workflows that covers the request, then
follow each selected `SKILL.md` completely.

## Route the request

- Build or substantially refine geometry: read
  `plugins/blender-agent-studio/skills/blender-modeling-workflow/SKILL.md`.
- Inspect an authored scene or exported asset: read
  `plugins/blender-agent-studio/skills/blender-asset-validation/SKILL.md`.
- Create or diagnose articulated motion: also read
  `plugins/blender-agent-studio/skills/blender-animation-workflow/SKILL.md`.
- Compare baseline, skill, prompt, or MCP capability: read
  `plugins/blender-agent-studio/skills/blender-agent-benchmark/SKILL.md`.
- Choose, configure, or evaluate Blender MCP transport: read
  `plugins/blender-agent-studio/skills/blender-mcp-integration/SKILL.md`.

Use modeling plus validation for normal asset-generation requests. Add animation
only when motion or articulation is required.

## Preserve the workflow contract

1. Resolve and record the exact Blender executable and version.
2. Convert the request into explicit parts, relationships, style, scale,
   animation, export, and evidence requirements.
3. Keep deterministic Python as the durable source for generated assets.
4. Inspect both the authored scene and a fresh import of the exported artifact.
5. Open and review fixed multiview evidence before claiming visual quality.
6. Treat automated metrics as gates and measurements, not substitutes for
   request compliance or visual judgment.
7. Keep benchmark conditions isolated and report failures, timing, and
   limitations alongside improvements.

Prefer the bundled bounded inspection and evidence tools when installed as a
Codex plugin. Do not add generic arbitrary-Python MCP execution.
