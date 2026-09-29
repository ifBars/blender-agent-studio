---
title: MCP tools
description: Sixteen bounded tools for inspecting, rendering, comparing, and sourcing assets. None of them runs arbitrary Python.
---

The plugin runs a local MCP server with Bun. Each tool starts Blender in the background for one bounded job and returns structured results. For live control of an open Blender session, pair it with Blender's official Lab MCP; the [MCP integration skill](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-mcp-integration/SKILL.md) explains when to use which.

## Inspect and validate

| Tool | What it does |
| --- | --- |
| `blender_version` | Verifies the Blender executable and returns its exact build. |
| `blender_inspect_asset` | Reports geometry, hierarchy, material, and animation metrics for `.blend`, `.glb`, `.gltf`, `.fbx`, or `.obj` files. |
| `blender_render_evidence` | Renders fixed multiview evidence and a contact sheet. |
| `blender_diagnose_topology` | Locates degenerate faces and zero-length edges in world space. |
| `blender_inspect_motion` | Samples named meshes across frames: transforms, geometry hashes, and bake metadata. |

## Render

| Tool | What it does |
| --- | --- |
| `blender_render_scene` | Checks or renders a scene through its own cameras and lighting. |

## Compare with a reference

| Tool | What it does |
| --- | --- |
| `blender_compare_reference` | Renders geometry through a reference camera as a reference, silhouette, and overlay board. |
| `blender_fit_reference_camera` | Fits focal length and lens shift from landmark correspondences. |

See [Reference images](reference-images.md) for the workflow.

## Analyze the scene

These three need the optional Rust runtime. See [Scene analysis](scene-analysis.md).

| Tool | What it does |
| --- | --- |
| `blender_describe_scene` | Lists hierarchy, evaluated bounds, authored roles, and spatial candidates. |
| `blender_quality_report` | Checks explicit triangle, closed-mesh, ground, and contact constraints. |
| `blender_compare_scenes` | Diffs a repaired scene against its baseline. |

## Assets

| Tool | What it does |
| --- | --- |
| `blender_search_polyhaven_assets` | Searches CC0 textures and HDRIs on Poly Haven. |
| `blender_download_polyhaven_asset` | Downloads a texture set or HDRI at 1K to 8K and verifies checksums. |
| `blender_prepare_mixamo_search` | Returns a Mixamo search URL and browser workflow. |
| `blender_import_mixamo_animation` | Imports a downloaded Mixamo FBX into a new `.blend`, without retargeting. |
| `blender_prepare_pixabay_sound_search` | Returns a Pixabay sound-effects search URL and browser workflow. |

The Mixamo and Pixabay tools are browser handoffs. They don't search the catalog or download anything themselves; the host's browser tools do that, and sign-in stays in the browser.

## Conventions

- **Blender path.** Tools that run Blender accept `blenderPath`. Otherwise they use `BLENDER_EXECUTABLE`, then `PATH`.
- **Time limits.** `timeoutMs` bounds each Blender process.
- **Outputs.** Results go to the output path you pass; most tools require a new or empty directory so earlier evidence isn't overwritten. Source files are never modified.

## Inline viewer

In hosts that support MCP Apps, `blender_render_scene`, `blender_render_evidence`, and `blender_compare_reference` open a compact viewer. You can switch views, inspect at 100% or fit to the panel, and expand render details. Other hosts get the structured result and the first image inline.
