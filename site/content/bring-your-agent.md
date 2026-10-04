---
title: A Blender AI plugin for your agent
description: Use a free, open-source Blender AI plugin from the agent you already work with. Codex and Claude Code have bundled installers today.
---

## Work where you already work

Blender Agent Studio brings modeling, animation, rendering, and inspection
workflows into your existing agent. Blender runs locally. You keep the editable
`.blend` file and the Python source, and can continue working on them in Blender
or ask your agent for another revision.

The plugin is free and [MIT licensed](https://github.com/ifBars/blender-agent-studio/blob/main/LICENSE).
Your chosen agent provider's usage terms and costs still apply.

## How the AI workflow works

Describe the asset or scene in your agent's conversation. The specialist skills
guide it through planning, a first build, and inspection. It writes Blender
Python and runs Blender locally to construct the scene. Rendered views and
geometry checks give it evidence for revisions before it delivers the files.

You can also start with an existing `.blend` and ask the agent to inspect or
refine it. For an export, specify the format and intended use; for a render,
describe the camera and lighting. [Try a first project](quickstart.md) for a
short prompt and the files to expect.

## What is portable today

The specialist workflows are `SKILL.md` files with bundled references and
scripts. The optional local tools use MCP. These are the building blocks for
using the same workflow across hosts.

| Route | Current support |
| --- | --- |
| Codex plugin | Bundled installer, skills, and MCP configuration; published generation comparisons. |
| Claude Code plugin | Bundled installer, the same skills and tools; published generation examples and comparisons. |
| Skills only | [Installation](install.md#skills-only) without MCP or plugin presentation metadata. |
| Other agent harnesses | Integration path for hosts with compatible skill loading and local execution; no general compatibility claim yet. |

The [gallery](comparisons.md) retains each model and run's results. Support for a
host does not guarantee the same quality across its models or tasks.

## What another harness needs

To carry out the full workflow, a host needs to:

- Load the relevant skills and let the agent read their bundled references.
- Read and write local files, and run Blender and the bundled scripts.
- Show rendered images to the model so it can review and refine its work.
- Connect to a local MCP server if you want the optional inspection, rendering,
  asset, or scene-analysis tools.

Plugin discovery, permission settings, and MCP configuration differ by host.
An MCP connection alone does not load the specialist skills or give an agent
local file and shell access. Start with a small asset, inspect the output, and
verify the complete workflow in your host before relying on it for larger work.

For the existing integration details, see [installation](install.md) and the
[MCP integration guide](https://github.com/ifBars/blender-agent-studio/blob/main/plugins/blender-agent-studio/skills/blender-mcp-integration/SKILL.md).

## Help expand compatibility

If you use another harness, [share a compatibility report](https://github.com/ifBars/blender-agent-studio/issues/new)
with its name and version, your Blender version, how you loaded the skills and
tools, a short prompt, and the resulting render. Record what worked and any
missing capabilities. This gives the project evidence for another supported
installation route.
