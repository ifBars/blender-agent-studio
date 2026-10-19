---
title: Installation
description: Install the plugin in Codex or Claude Code and point it at your Blender executable.
---

## Requirements

| Tool | Version |
| --- | --- |
| Codex or Claude Code | A release with plugin support |
| Blender | 5.2 LTS, the tested version |
| Bun | 1.3.5 or newer |
| Rust | Stable toolchain, only for [scene analysis](scene-analysis.md) |

## Install the plugin

Both hosts install the same twelve specialist skills and local MCP server. Choose the commands for your host.

```bash title="Codex"
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

```bash title="Claude Code"
claude plugin marketplace add ifBars/blender-agent-studio
claude plugin install blender-agent-studio@blender-agent-studio
```

Inside a Claude Code session, you can also run `/plugin marketplace add ifBars/blender-agent-studio` followed by `/plugin install blender-agent-studio@blender-agent-studio`.

## Point it at Blender

Put `blender` on your `PATH`, or set `BLENDER_EXECUTABLE` to the executable:

```bash title="macOS / Linux"
export BLENDER_EXECUTABLE="/path/to/blender"
```

```powershell title="Windows (PowerShell)"
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

MCP tools also accept a `blenderPath` argument, and benchmark commands accept `--blender`.

Shell environment changes apply to that terminal and programs launched from it.
Launch your CLI agent from that terminal, or configure the environment used by
your desktop host. A new conversation alone may not inherit a changed variable.
You can also pass `blenderPath` directly when calling an MCP tool.

## Verify before your first project

Start a new Codex task or Claude Code session after installing or changing your
environment. Ask your agent:

> Run `bun run doctor` in the installed Blender Agent Studio plugin directory,
> then call `blender_version` to check the MCP connection.

The doctor saves and reopens a tiny scene and renders a 128px preview with Cycles
on CPU. It needs no GPU, API key, downloads, or Rust. It retains the `.blend`,
preview, process logs and `doctor-report.json` in a new temporary folder and
prints the location. It never opens your projects. From a repository checkout,
`bun run doctor` also works at the root.

```bash title="Optional explicit paths"
bun run doctor --blender "/absolute/path/to/blender" --output-dir setup-check
```

The output directory must be new. Quote paths containing spaces.

### Troubleshooting

- **Bun not found:** install [Bun](https://bun.sh), then open a new terminal and
  restart your agent session. Use version 1.3.5 or newer.
- **Blender not found:** use the executable path, not the enclosing directory.
  On macOS, a typical path is `/Applications/Blender.app/Contents/MacOS/Blender`.
  `--blender` overrides `BLENDER_EXECUTABLE` and `PATH` for this check.
- **Blender version warning:** 5.2 LTS is the tested version; another version can
  pass the probe, but that does not establish compatibility with every workflow.
- **Rendering fails:** inspect `blender-process.json` in the output folder.
  `--skip-render` isolates Python and save/reopen; it does not verify rendering.
- **Timeout:** try `--timeout-ms 180000` for a slow CPU. The default whole-process
  limit is 90 seconds, with a maximum of 300 seconds.
- **Doctor passes, tools still missing:** restart the agent session and ask for
  `blender_version`. The doctor checks local Blender only, not host plugin loading,
  MCP transport, GPU rendering, network assets or the optional Rust runtime.

A failed check returns a nonzero exit code. `--json` prints the structured report.
Review logs for local paths before sharing them in an issue.

## Update

```bash title="Codex"
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

```bash title="Claude Code"
claude plugin marketplace update blender-agent-studio
claude plugin update blender-agent-studio@blender-agent-studio
```

Start a new task or session afterwards. If you built the scene analysis runtime, rebuild it too.

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

```bash title="Router and all twelve specialists"
bunx skills add -g ifBars/blender-agent-studio --skill "*" --agent codex --full-depth -y
```

For Claude Code, replace `--agent codex` with `--agent claude-code`. This route installs skills without the MCP server or plugin presentation metadata.
