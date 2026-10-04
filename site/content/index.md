---
title: Introduction
description: A free, open-source Blender AI plugin for the tools you already use. Start in Codex or Claude Code and keep your .blend file and Python source.
---

## Start with an example

Browse the [interactive gallery](comparisons.md) before installing. It includes
props, mechanical assemblies, and furnished scenes, with results from both
Codex and Claude Code. Each pair shows the same task and model with and without
the plugin; the reports retain failed checks and mixed visual reviews.

The reading room above is one selected Sonnet 5.5 result. Its HD preview uses
the saved scene's authored camera and lighting. It shows what one run produced,
not an average-quality claim.

The plugin is [MIT licensed](https://github.com/ifBars/blender-agent-studio/blob/main/LICENSE).
Use it with your Codex or Claude Code account and local Blender installation.

Its workflows use portable skill files and local tools. Codex and Claude Code
have bundled installers today; [bring your agent](bring-your-agent.md) explains
what another host needs and where compatibility still needs testing.

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
