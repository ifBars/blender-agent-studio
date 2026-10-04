---
title: How it works
description: Skills plan the work, Blender builds it in the background, and evidence decides when it's done.
---

The plugin has two parts. **Skills** tell the agent how to approach Blender work. A local **MCP server** gives it bounded tools for inspection, rendering, and asset downloads. Blender runs on your machine without its interface open.

## The workflow

For a typical asset, the agent works through these stages, combining related ones when it helps:

1. **Contract.** Turn the brief into parts, relationships, style, scale, finish, and deliverables, and decide what evidence proves each must-have.
2. **References.** Gather images from several angles and write down the proportions they imply.
3. **Graybox.** Block out the primary forms and compare them with the references before adding detail.
4. **Form and structure.** Add secondary and tertiary detail and refine the structure.
5. **Materials and polish.** Apply materials and textures, then polish the surfaces.
6. **Validation.** Inspect the authored scene and a fresh import of any export, then review the rendered views.

The agent records routine decisions instead of asking about them, and internal reviews don't become approval gates.

For a full scene, the workflow establishes composition and functional zones,
finishes representative assets before repetition, decorates in purposeful
clusters and checks reverse/secondary areas in authored lighting. For game
characters it prioritizes coherent anatomy and garment fit, with early bend,
reach and twist checks when a rig is requested. These workflow changes still
need paired modeling results before claiming a measured quality gain.

## Optional modeling timelapse

Ask for a timelapse at the start of a modeling job. The agent records the real
empty/default scene and build milestones, then delivers an MP4 and labeled
stills after finishing. The camera stays fixed; early stages borrow the final
lighting so progress is readable. This is checkpoint history, not a Blender
screen recording. It adds disk/render time and stays disabled unless requested.
A finished scene alone cannot recover its build history.

## Evidence renders

`blender_render_evidence` renders a hero perspective plus fixed front, back, left, right, and top views, and a contact sheet. A studio light rig is scaled to the asset.

- **During repairs,** two relevant views at low resolution give fast feedback. They don't replace the final six-view check.
- **`presentation`** sets the backdrop. `auto` picks a contrasting one from simple material hints; pin `neutral`, `dark`, or `light` for repeatable comparisons.

Studio views are for inspection. They don't replace your scene's own lighting.

## Beauty renders

`blender_render_scene` renders through the scene's own cameras, lights, world, and color management. It caps resolution, samples, and render time, and never saves the source. Set `inspectOnly` to list cameras, lights, and missing dependencies first.

| `denoise` | Behavior |
| --- | --- |
| `preserve` | Default. Keeps the scene's authored settings. |
| `preview` | Favors speed, using GPU OIDN Fast where supported. |
| `final` | Favors quality, using OIDN High or Accurate. |
| `off` | Turns off render denoising. Compositor denoising stays as authored. |

## Python is the source

Generated assets are built by deterministic Python. The `.blend` is the editable result; the script records how to make it. Before delivery, the agent regenerates the scene from clean source, so what you receive matches the script.

## Boundaries

- Every Blender call has a timeout, and renders have resolution, sample, and time caps. There is **no generic arbitrary-Python MCP tool**.
- Automated metrics are gates and measurements. They don't replace visual review or checking the result against the request.
- Scripts run inside Blender. Review unfamiliar scripts, and don't open untrusted `.blend` files with automatic script execution on. See the [security notes](https://github.com/ifBars/blender-agent-studio/blob/main/SECURITY.md).
