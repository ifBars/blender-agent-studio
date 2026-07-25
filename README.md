<p align="center">
  <img src="plugins/blender-agent-studio/assets/blender-icon.png" width="112" alt="Blender logo">
</p>

# Blender Agent Studio

[![Validate](https://github.com/ifBars/blender-agent-studio/actions/workflows/validate.yml/badge.svg)](https://github.com/ifBars/blender-agent-studio/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Codex plugin for reproducible Blender modeling, technical and visual
validation, mechanical animation, bounded MCP tooling, and paired agent
benchmarking.

It gives agents a disciplined workflow for building `.blend` and GLB assets
from Python, inspecting the authored scene and fresh exports, rendering fixed
multiview evidence, and measuring whether workflow changes actually improve
results.

## Install

Add this repository as a Codex plugin marketplace, then install the plugin:

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Start a new Codex task after installation so its skills and MCP tools load.

To update a GitHub-backed installation:

```bash
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

## Configure Blender

Blender 5.2 LTS is the validated runtime. Put `blender` on `PATH`, pass
`--blender` to benchmark commands, or set:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

```bash
export BLENDER_EXECUTABLE="/path/to/blender"
```

## Skills

| Skill | Purpose |
| --- | --- |
| `blender-modeling-workflow` | Contract-first procedural modeling and multiview iteration |
| `blender-asset-validation` | Evaluated geometry checks, fresh GLB import, and fixed evidence renders |
| `blender-animation-workflow` | Mechanical pivots, critical frames, and connector invariants |
| `blender-agent-benchmark` | Isolated baseline/plugin runs, hard gates, rescoring, and blinded judging |
| `blender-mcp-integration` | Choose between the official Blender Lab MCP, bundled evaluator MCP, and community options |

Example:

> Use `$blender-agent-studio:blender-modeling-workflow` and
> `$blender-agent-studio:blender-asset-validation` to build a stylized,
> game-ready coffee grinder as reproducible Python, `.blend`, and GLB files.

Add `$blender-agent-studio:blender-animation-workflow` for articulated assets.

## Bounded MCP

The included local MCP exposes:

- `blender_version`
- `blender_inspect_asset`
- `blender_render_evidence`

It deliberately does not expose generic arbitrary Python execution. The MCP is
an evaluation convenience; the benchmark measures skill-only and skill-plus-MCP
conditions separately.

## Benchmark

Install dependencies inside the plugin directory:

```bash
cd plugins/blender-agent-studio
bun install
```

Run isolated conditions into new output directories:

```powershell
bun run benchmark --suite quick --mode baseline --output C:\bench\baseline --blender $env:BLENDER_EXECUTABLE
bun run benchmark --suite quick --mode skills --output C:\bench\skills --blender $env:BLENDER_EXECUTABLE
```

The validated July 2026 snapshot covered a signal lantern, tabletop press,
animated winch drawbridge, and foot-pump holdout. Final plugin runs received
10 of 10 blinded preference votes, introduced no hard-gate regression, and
passed the holdout where the baseline failed. Plugin runs averaged about 48%
longer because they performed validation and evidence work.

That is directional evidence from one selected generation per condition—not a
universal claim. See the
[methodology](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md)
and [validated result](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/validated-results.md).

## Development

This repository uses Bun:

```bash
bun install --cwd plugins/blender-agent-studio
bun run check
bun run test
```

Generated models, exports, renders, benchmark runs, and agent traces are
excluded from source control.

## Security and trademarks

Review untrusted Blender Python before execution. See [SECURITY.md](SECURITY.md)
for the execution boundary and generated-artifact guidance.

Blender and the Blender logo are trademarks of the Blender Foundation. This
project is not affiliated with or endorsed by the Blender Foundation. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE)
