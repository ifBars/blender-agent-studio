---
title: Installation
description: Install the plugin in Codex and point it at your Blender executable.
---

## Requirements

| Tool | Version |
| --- | --- |
| Codex | A release with plugin support |
| Blender | 5.2 LTS, the tested version |
| Bun | 1.3.5 or newer |
| Rust | Stable toolchain, only for [scene analysis](scene-analysis.md) |

## Install the plugin

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Start a new Codex task afterwards so the skills and MCP server load.

## Point it at Blender

Put `blender` on your `PATH`, or set `BLENDER_EXECUTABLE` to the executable:

```bash title="macOS / Linux"
export BLENDER_EXECUTABLE="/path/to/blender"
```

```powershell title="Windows (PowerShell)"
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

MCP tools also accept a `blenderPath` argument, and benchmark commands accept `--blender`.

## Update

```bash
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Start a new task afterwards. If you built the scene analysis runtime, rebuild it too.

## Scene analysis runtime

Three tools use a small Rust executable for [scene analysis](scene-analysis.md). Build it once from the **installed plugin directory**, the one containing `mcp`, `runtime`, and `package.json`:

```bash
bun run setup:runtime
```

Or set `BAS_RUNTIME_EXECUTABLE` to a compatible `bas-runtime` build. Every other tool works without Rust.

## Skills only

To install the skills without the MCP server, use the skills CLI:

```bash title="Router skill"
bunx skills add -g ifBars/blender-agent-studio --skill blender-agent-studio --agent codex -y
```

```bash title="Router and all eleven specialists"
bunx skills add -g ifBars/blender-agent-studio --skill "*" --agent codex --full-depth -y
```
