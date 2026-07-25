---
name: blender-mcp-integration
description: Choose, configure, and use Blender MCP integrations for live scene control or deterministic asset evaluation. Use when connecting Codex to an open Blender instance, deciding between Blender Lab MCP and community Blender MCP servers, troubleshooting Blender MCP connectivity, or evaluating whether MCP tools improve a Blender modeling workflow.
---

# Blender MCP Integration

Use the narrowest MCP layer that improves the task.

## Choose the layer

1. Prefer Blender's official Lab MCP for Blender 5.1+ live scene inspection, screenshots, documentation lookup, rendering, navigation, and Python execution.
2. Use Blender Agent Studio's MCP for deterministic batch inspection and standardized evidence renders used by validation and benchmarking.
3. Consider `ahujasid/blender-mcp` only when the request needs its additional remote-host, Poly Haven, Sketchfab, or external 3D-generation integrations and accepts the extra installation, network, credential, and telemetry surface.
4. Do not run multiple add-on socket servers on the same host/port.

Read [references/mcp-options.md](references/mcp-options.md) before installing or replacing a Blender add-on.

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
