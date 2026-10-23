# Blender MCP options

## Blender Lab MCP

Source: https://www.blender.org/lab/mcp-server/

Repository: https://projects.blender.org/lab/blender_mcp

Use when the task needs live Blender interaction on a supported version.
Ordinary scripted builds, inspection, and rendering use the bundled tools and
Blender CLI; do not install a second server without a task-specific need.

Strengths:

- maintained by Blender Lab;
- supports interactive and background Blender;
- bundles Blender Python API and user-manual documentation;
- scene, object, file, dependency, and missing-file summaries;
- area/window screenshots and UI navigation;
- viewport and thumbnail rendering;
- deliberately small implementation;
- weak sandbox blocks selected dangerous operations.

The interactive path needs the Blender extension enabled and connects over a local TCP socket. The MCP process uses stdio toward the agent host (Codex or Claude Code).

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

Use for high-level, deterministic evaluation:

- exact Blender build fingerprint;
- asset metrics in a clean background process;
- fixed multiview evidence and contact sheets;
- authored-camera stills preserving lighting, world, volumes and color management;
- render preflight, bounded device/sample/resolution controls and inline PNG review;
- benchmark result preparation.

The optional bundled **Agent Studio Live** addon also provides an inline
viewport, refreshed captures, bounded axis/orbit/zoom navigation, and
surface/object-list selection for the user's next prompt. Use
`blender_open_viewport` after connecting in Blender's Agent Studio sidebar.
The addon does not author geometry or execute arbitrary code. Batch tools stay
independent, and a live capture does not replace final validation.

## Broader agent capability comparison

The relevant ecosystem splits into complementary layers rather than a single
server to install everywhere:

| Layer | Representative implementation | Useful coverage | Studio decision |
| --- | --- | --- | --- |
| Live observation and navigation | Blender Agent Studio Live | inline viewport, selected-object context, refresh and view controls | Prefer for Studio's integrated viewport experience; install the bundled addon only when needed. |
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
