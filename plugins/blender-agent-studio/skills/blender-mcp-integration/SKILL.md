---
name: blender-mcp-integration
description: Choose, configure, and use Blender MCP integrations for live scene control or deterministic asset evaluation. Use when connecting Codex to an open Blender instance, deciding between Blender Lab MCP and community Blender MCP servers, troubleshooting Blender MCP connectivity, or evaluating whether MCP tools improve a Blender modeling workflow.
---

# Blender MCP Integration

Read [the shared execution guidance](references/astra-workflow.md) once per task
for autonomous decisions, evidence cadence, and long-task continuity.

Use the narrowest MCP layer that improves the task.

## Choose the layer

1. Prefer Blender's official Lab MCP for Blender 5.1+ live scene inspection, screenshots, documentation lookup, rendering, navigation, and Python execution.
2. Use Blender Agent Studio's MCP for deterministic batch inspection, standardized geometry evidence, and bounded authored-scene renders. `blender_render_scene` preserves cameras, lights, volumes and color management and returns the first image inline; `inspectOnly` discovers scene settings before rendering. The bundled Poly Haven search/download tools also acquire verified CC0 textures and HDRIs without another add-on or API key; see the rendering workflow for material setup and standalone CLI use.
3. Consider `ahujasid/blender-mcp` only when the request needs its additional remote-host, Poly Haven, Sketchfab, or external 3D-generation integrations and accepts the extra installation, network, credential, and telemetry surface.
4. Do not run multiple add-on socket servers on the same host/port.

Read [references/mcp-options.md](references/mcp-options.md) before installing or replacing a Blender add-on.

## Mixamo browser integration

`blender_prepare_mixamo_search` returns a browser search URL and workflow, not
catalog results. Use host browser tools for live search, preview and download,
then `blender_import_mixamo_animation` for a new standalone animated `.blend`.
Adobe sign-in stays in the browser. See the animation workflow's
[Mixamo guide](../blender-animation-workflow/references/mixamo.md) for the
download settings, local import and retargeting limits.

## Optional scene analysis runtime

Use `blender_compare_reference` for a camera-matched reference/silhouette/overlay
board. It works directly through Blender without Rust and returns the image
inline. A reviewed white-on-black mask optionally enables projection metrics;
photos alone produce visual comparison, not guessed similarity scores. Author
the reference camera with bpy or the live MCP before comparing geometry.

`blender_describe_scene`, `blender_quality_report` and `blender_compare_scenes`
use the bundled Rust SceneIR analyzer. Run `bun run setup:runtime` in the installed plugin root with
a stable Rust toolchain, or set `BAS_RUNTIME_EXECUTABLE` to a compatible built
binary. Rebuild after updates. The existing tools remain independent of Rust.

Start with a compact scene description, then query an exact `objectId` and its
descendants. Bounds use evaluated world geometry. Semantic roles come only from
authored `bas_role` properties. Supply quality constraints from the brief;
ground checks require named objects and `groundZ`. AABB relations are candidates,
not exact mesh intersections. Keep the returned limitations and required visual
questions attached to the findings. No numerical aesthetic score is produced.

After a source-level repair, compare the preserved and regenerated assets with
`blender_compare_scenes`. Keep its factual changes separate from explicitly
declared invariant failures, and pair it with identical visual evidence. Use
`invariantObjects` when preservation gates should exclude the edited component.

## Preserve reproducibility

- Keep the durable model in a Python source file even when using live MCP execution.
- Save a new `.blend` before risky arbitrary-code operations.
- Use official MCP screenshots for interactive iteration.
- Use `$blender-agent-studio:blender-asset-validation` for final clean-process inspection and fixed evidence cameras.
- Record which MCP tools were used in benchmark runs.

## Benchmark MCP value

Compare:

1. plugin skills with MCP tools unavailable;
2. the same skills with the candidate MCP enabled.

Keep task, model, effort, time budget, and evaluator identical. Count execution failures, recovery turns, time, and final asset quality. Retain an MCP dependency only when it improves outcomes or materially reduces reliable completion cost.
