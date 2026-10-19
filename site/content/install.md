---
title: Installation
description: Install the plugin in Codex or Claude Code, check your setup, and point it at Blender if needed.
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

## Check your setup

Start a new Codex task or Claude Code session after installing, then ask:

> Check my Blender Agent Studio setup.

The agent calls `blender_check_setup`. It finds Blender, saves and reopens a tiny
scene with scripts disabled, renders a 128px preview with Cycles on CPU and a
64px preview with EEVEE, and reports where it saved them. It needs no GPU, API key,
downloads, or Rust, and it never opens your projects. Each check reports pass,
warning, or failure with the next step. The `.blend`, previews, process logs and
`doctor-report.json` stay in a new temporary folder.

## Point it at Blender

Usually there is nothing to configure. The plugin uses the first Blender it finds:

1. A `blenderPath` argument to an MCP tool, or `--blender` for the doctor and benchmarks.
2. The `BLENDER_EXECUTABLE` environment variable.
3. `blender` on your `PATH`.
4. Standard install locations: `/Applications` on macOS, `Program Files\Blender Foundation`
   on Windows, Steam, and on Linux Snap, Flatpak, and archives unpacked in your
   home folder or `/opt`. When several are installed, it prefers 5.2 LTS.

A configured path that is wrong is reported, never silently replaced. For any
other location, set `BLENDER_EXECUTABLE` to the executable itself, not its folder:

```bash title="macOS / Linux"
export BLENDER_EXECUTABLE="/Applications/Blender.app/Contents/MacOS/Blender"
```

```powershell title="Windows (PowerShell)"
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

Shell environment changes apply to that terminal and programs launched from it.
Launch your CLI agent from that terminal, or configure the environment used by
your desktop host. A new conversation alone may not inherit a changed variable.
`blender_version` reports which executable was found and how.

## Check from a terminal

The same check runs without an agent, from a repository checkout or the
installed plugin directory (the one containing `mcp`, `scripts`, and `package.json`):

```bash
bun run doctor
```

```bash title="Optional explicit paths"
bun run doctor --blender "/absolute/path/to/blender" --output-dir setup-check
```

The output directory must be new. Quote paths containing spaces. A failed check
returns a nonzero exit code, and `--json` prints the structured report.

### Troubleshooting

- **Bun not found:** install [Bun](https://bun.sh), then open a new terminal and
  restart your agent session. Use version 1.3.5 or newer.
- **Blender not found:** install [Blender](https://www.blender.org/download/), or
  set `BLENDER_EXECUTABLE` as above. Use the executable path, not the enclosing
  directory. `--blender` overrides every other source for the doctor.
- **Blender version warning:** 5.2 LTS is the tested version; another version can
  pass the probe, but that does not establish compatibility with every workflow.
- **EEVEE warning:** Cycles works, but the studio inspection views from
  `blender_render_evidence` need OpenGL. Install a GPU driver, or on a headless
  Linux machine software OpenGL such as Mesa (`libegl1` and `libgl1-mesa-dri` on
  Debian and Ubuntu). Software OpenGL works but is slow.
- **Rendering fails:** inspect `blender-process.json` in the output folder.
  `--skip-render` isolates Python and save/reopen; it does not verify rendering.
- **Timeout:** try `--timeout-ms 180000` for a slow CPU. Each Blender process has a
  90-second limit by default, with a maximum of 300 seconds.
- **The agent cannot find `blender_check_setup`:** the plugin's MCP server did not
  load. Restart the agent session, check that Bun is on the `PATH` your host sees,
  and confirm the plugin is installed. The first start needs network access so Bun
  can fetch the server's dependencies.

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
