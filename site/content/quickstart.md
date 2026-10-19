---
title: First project
description: Ask for an asset, say what matters, and review what comes back.
---

First, ask your agent to "check my Blender Agent Studio setup". The [setup
check](install.md#check-your-setup) verifies Blender can save, reopen and render
a scene on your machine.

## Ask for something

Open a new Codex task or Claude Code session and describe what you want:

> Use Blender Agent Studio to build a walnut desk lamp. Give it warm lighting, render it from two angles, and save the .blend and Python source.

The agent records routine assumptions and asks only when different readings of the brief would produce a different result.

### Your first success

For this lamp prompt, ask the agent to show you both rendered images and the
paths to the editable `.blend` and build script. Open the images and check that
the lamp has a supported shade, readable walnut material, and warm light. A
saved scene alone is not a completed render task.

You can make this example with procedural materials and local Blender, without
an asset download or extra service account. Your agent's normal usage costs
still apply. If execution fails, return to the [setup check](install.md#check-your-setup)
and share the failing step with the agent.

## Say what matters

- **Style, dimensions, and intended use.** "A 30 cm stylized lantern for a mobile game" leaves less to guess than "a lantern".
- **Game assets.** Ask for a GLB export and a check that it imports correctly.
- **Renders.** Name a camera angle or lighting mood, or supply a reference image.
- **Low-poly or blockout.** Say so. Otherwise the target is a polished, smooth asset with secondary detail.

## Review what comes back

| File | What it is |
| --- | --- |
| `create_asset.py` | The build script. Rerun it to regenerate the scene. |
| `asset.blend` | The editable result. |
| `asset.glb` | The export, when you asked for one. |
| Evidence renders | A hero view plus front, back, left, right, and top. |

Names vary with the request. Open the renders before accepting the result; they show what the numbers can't.

For a larger scene brief and a review across three camera views, see the
[reading-room walkthrough](reading-room.md).

## Keep going

- **Change it.** Ask for edits. The agent updates the Python and rebuilds.
- **Bring your own file.** Point the agent at an existing `.blend` and ask it to inspect or refine the scene.
- **Ask for a second pass.** Request a critique and repair. The refinement skill fixes the highest-impact defect, then checks that nothing else regressed.

## Call a skill directly

Both hosts choose relevant [skills](skills.md) from a plain request. To call a specialist directly, use the syntax for your host:

```text title="Codex"
$blender-agent-studio:blender-modeling-workflow Build a stylized game-ready coffee grinder as create_asset.py, asset.blend, and asset.glb.
```

```text title="Claude Code"
/blender-agent-studio:blender-modeling-workflow Build a stylized game-ready coffee grinder as create_asset.py, asset.blend, and asset.glb.
```
