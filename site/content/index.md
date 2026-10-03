---
title: Introduction
description: A plugin for Codex and Claude Code that plans, builds, and checks Blender models, animations, and scenes in your local Blender installation.
---

## What you get back

Every build leaves you with files you can open, rerun, and change:

- **A `.blend` file**, the editable result.
- **The Python source** that built it, so you or the agent can regenerate and revise the scene.
- **Evidence renders** from a hero angle and five fixed views, which the agent reviews before delivery.
- **A `.glb` export** when you ask for one, checked by reopening it in a fresh Blender process.

## How a request flows

1. You describe the subject and anything that matters, such as style, dimensions, or intended use.
2. The agent loads the relevant [skills](skills.md) and turns the brief into a short contract: parts, proportions, finish, and deliverables.
3. Blender runs locally in the background. The agent reviews a graybox before spending time on materials and detail.
4. Before delivery, it checks geometry, exports, and rendered views, then repairs what fails.

[How it works](how-it-works.md) covers each stage.

> [!NOTE]
> Automated checks are gates, not taste. Review the result yourself, particularly its shape, materials, animation, and exports. The [results](results.md) page shows where the plugin helped and where it didn't.
