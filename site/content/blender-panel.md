---
title: Agent panel in Blender
description: Chat with Claude Code or Codex from a sidebar tab in Blender. The agent can edit your open scene directly, or build separately and add its results.
---

The Studio Live addon adds an **Agent** panel to Blender's 3D Viewport sidebar. Type a request, and the Claude Code or Codex CLI you already have runs in the background with this plugin's skills and MCP tools. It can edit your open scene directly, or build in the background and add the result when it finishes.

The panel is a chat front end for your own CLI, not a terminal: it shows the agent's replies and the tools it runs, and it uses your existing login and subscription. Nothing else is installed or contacted.

## Set it up

1. Install [Claude Code](https://code.claude.com) or [Codex](https://developers.openai.com/codex), sign in, and [install the plugin](install.md) in it.
2. In Blender 4.5 or newer, open **Edit → Preferences → Add-ons → Install from Disk** and select `addon/blender_agent_studio_live.py` from the plugin folder. Enable **Blender Agent Studio Live**.
3. In a 3D Viewport, press **N** and choose the **Agent Studio** tab.

## Use it

Choose the agent, type a request, and press **Send**.

> Build a walnut desk lamp with a brass arm, about 45 cm tall.

While the agent works, the panel shows its current step and a **Stop** button, and Blender stays usable. Its replies and tool calls appear above the prompt. Later messages continue the same conversation; **New Chat** starts a fresh one.

| Control | What it does |
| --- | --- |
| **Allow Live Edits** | Lets the agent edit the open scene directly. Off by default; see [edit the open scene](#edit-the-open-scene). |
| **Share Open Scene** | Saves a copy of the open file to the session folder with each message, and tells the agent your selection and active object. Your file, its path and its unsaved-changes state are not touched. |
| **Add Results to Scene** | When the agent finishes, appends its result to the scene in a new `Agent: <name>` collection. Turn it off to add results yourself with the **Add** button. |
| **Open Session Folder** | Shows the chat's Python sources, renders, result `.blend` files and `transcript.md`. |

Each chat gets its own folder under `~/blender-agent-studio`. Press **Connect Agent Studio** under **Viewport Sharing** if you also want the agent to see your [live viewport](mcp-tools.md#live-viewport).

## Edit the open scene

Tick **Allow Live Edits** and the agent works in your open scene: it writes a Python script to the session folder, runs it in your Blender session with `blender_live_run_python`, looks at the viewport image that comes back, and repeats. No copy of your file is made, and the agent can change objects you already have.

- Each script run is one undo step, so **Ctrl+Z** steps back through the agent's edits. A script that fails partway keeps the changes it made before the error.
- Blender is blocked while a script runs. Runs are usually short; a script that never ends has to be stopped by closing Blender, so save before a long session.
- A script can change or delete anything in the session and do anything Python can on your computer. The agent is told not to save, open or revert files, but nothing enforces that.
- The box is not saved: it is off again when Blender restarts, and unticking it stops live edits at once. Sending a message with it ticked also turns on viewport sharing, which the live edits use.
- The sources stay in the session folder, so you can read or rerun what the agent did.

With the box unticked, the agent cannot touch the open scene and works as described next.

## How results reach your scene

Without live edits, the agent never scripts your open Blender session. It builds in separate background Blender processes, as it does from a terminal, and saves a `.blend` in the session's `results` folder. The panel appends that file's objects.

- The agent can add objects. It cannot move, edit or delete objects you already have. To change one, it delivers a replacement and names the original for you to hide or delete, or you allow live edits.
- When the agent revises a result, the earlier `Agent:` collection is hidden, not deleted, so edits you made to it are kept. Delete old collections when you no longer need them.
- Appending brings in objects with their meshes, materials and animation. World lighting and render settings in the result file are not applied.
- An automatic import is one undo step.

## Access

The addon's preferences set how much the agent may do without asking, since nobody can approve prompts from the panel.

| Setting | Claude Code | Codex |
| --- | --- | --- |
| **Session folder** (default) | Edits files in the session folder and runs Blender and this plugin's MCP tools. Other shell commands are refused, and the panel reports how many. | Runs in Codex's `workspace-write` sandbox. |
| **Full access** | Runs any command without asking. | Runs any command without asking or sandboxing. |

The Claude Code setting limits which commands start. It is not a sandbox: a Blender script the agent writes can do anything Python can. Use **Full access** only with prompts and files you trust.

The preferences also hold optional paths to the CLIs, a model for each, the sessions folder, and a plugin folder. Set the plugin folder to `plugins/blender-agent-studio` to run an uncommitted checkout; otherwise the agent uses the plugin installed in the CLI.

## Troubleshooting

- **"Claude Code was not found"**: Blender started from a desktop launcher may not see your shell's `PATH`. The addon also looks in common install folders; if that fails, set the CLI's path in the addon preferences.
- **"The agent stopped (exit code …)"**: the message includes the CLI's last error lines. Run `claude` or `codex` once in a terminal to sign in.
- **The agent cannot find its tools**: check that Bun is installed and the plugin is installed in the CLI. Ask it to *check my Blender Agent Studio setup*.
- **Nothing was added**: the agent did not save a `.blend` in `results`. Ask it to deliver the model, or open the session folder.
