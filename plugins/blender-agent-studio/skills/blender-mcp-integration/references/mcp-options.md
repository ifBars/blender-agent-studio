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

## Broader agent capability comparison

The relevant ecosystem splits into complementary layers rather than a single
server to install everywhere:

| Layer | Representative implementation | Useful coverage | Studio decision |
| --- | --- | --- | --- |
| Official live control | Blender Lab MCP | scene/file inspection, docs, screenshots, navigation, rendering, Python | Prefer for an open Blender session on supported Blender versions. |
| Community live/external bridge | ahujasid/blender-mcp | object/material control, screenshots, arbitrary Python, remote hosts, Poly Haven, Sketchfab, external mesh generation | Opt in only for its unique external capability and explicitly accept its credentials, downloads, telemetry, and socket surface. |
| Broad headless automation | sandraschi/blender-mcp | mesh/sculpt, Geometry Nodes, compositor, VSE, Grease Pencil, physics, export, optional live bridge | Treat as a workflow reference or task-specific integration; do not duplicate its broad mutable tool catalog in this plugin. |
| Deterministic evaluator | Blender Agent Studio MCP | build fingerprint, clean-process metrics, fixed evidence renders, benchmark preparation | Keep bundled and narrow; use it to verify work made through any authoring layer. |

Skills should cover the durable workflow gaps across modeling, procedural
systems, rendering, simulation, characters, animation, and validation. MCP
tools should provide transport or local observation, not replace contracts,
cache provenance, fresh-import checks, and visual review.

Sources: https://www.blender.org/lab/mcp-server/ ;
https://github.com/ahujasid/blender-mcp ;
https://github.com/sandraschi/blender-mcp
