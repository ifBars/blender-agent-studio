# Blender MCP options

## Blender Lab MCP

Source: https://www.blender.org/lab/mcp-server/

Repository: https://projects.blender.org/lab/blender_mcp

Use by default with Blender 5.1 or newer.

Strengths:

- maintained by Blender Lab;
- supports interactive and background Blender;
- bundles Blender Python API and user-manual documentation;
- scene, object, file, dependency, and missing-file summaries;
- area/window screenshots and UI navigation;
- viewport and thumbnail rendering;
- deliberately small implementation;
- weak sandbox blocks selected dangerous operations.

The interactive path needs the Blender extension enabled and connects over a local TCP socket. The MCP process uses stdio toward Codex.

## ahujasid/blender-mcp

Source: https://github.com/ahujasid/blender-mcp

Consider only for capabilities outside the official server:

- Poly Haven and Sketchfab asset access;
- Hyper3D/Hunyuan external generation;
- remote Blender host support.

Costs and risks:

- separate add-on and Python MCP package;
- overlapping arbitrary Python execution;
- optional external credentials and downloads;
- telemetry configuration;
- more connection and version surfaces.

Disable telemetry explicitly when evaluating it if the benchmark should remain local.

## blender-mcp.com

Source: https://blender-mcp.com/

The site's GitHub link resolves to `ahujasid/blender-mcp`; treat it as a guide/landing page for that implementation, not an independent server.

## Blender Agent Studio MCP

Use only for high-level, deterministic evaluation:

- exact Blender build fingerprint;
- asset metrics in a clean background process;
- fixed multiview evidence and contact sheets;
- benchmark result preparation.

It intentionally does not replace general live scene control or duplicate arbitrary-code execution.
