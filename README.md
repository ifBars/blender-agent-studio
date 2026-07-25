<p align="center">
  <img src="plugins/blender-agent-studio/assets/blender-icon.png" width="112" alt="Blender logo">
</p>

# Blender Agent Studio

[![Validate](https://github.com/ifBars/blender-agent-studio/actions/workflows/validate.yml/badge.svg)](https://github.com/ifBars/blender-agent-studio/actions/workflows/validate.yml)
[![skills.sh](https://skills.sh/b/ifBars/blender-agent-studio)](https://skills.sh/ifBars/blender-agent-studio/blender-modeling-workflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Build, inspect, animate, and benchmark Blender assets with reproducible Python,
fixed visual evidence, deterministic quality gates, and a bounded local MCP.

Blender Agent Studio packages one umbrella routing skill, five specialist
skills, and evaluation tools for turning a user request into inspectable
`.blend` and GLB deliverables. It is designed to answer a harder question than
“did Blender produce a file?”: does the result satisfy the request, survive
export, read correctly from every side, and improve when the agent workflow
changes?

## Quick start

Install the complete Codex plugin from this GitHub marketplace:

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Start a new Codex task, then ask:

> Use `$blender-agent-studio:blender-modeling-workflow` and
> `$blender-agent-studio:blender-asset-validation` to build a stylized,
> game-ready coffee grinder as reproducible Python, `.blend`, and GLB files.

Add `$blender-agent-studio:blender-animation-workflow` when the asset has
articulated or animated parts.

<details>
<summary><strong>Installation options: full plugin or skills only</strong></summary>

### Full Codex plugin

The marketplace install includes all five skills, the Blender icon and plugin
metadata, and the bounded local MCP:

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Update a GitHub-backed installation:

```bash
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

### Skills-only install

Install the umbrella routing skill through the Vercel Agent Skills CLI:

```bash
bunx skills add -g ifBars/blender-agent-studio --skill blender-agent-studio --agent codex -y
```

Install the umbrella and all five specialist skills:

```bash
bunx skills add -g ifBars/blender-agent-studio --skill "*" --agent codex --full-depth -y
```

The skills-only route does not install the bundled MCP or Codex plugin
presentation metadata.

</details>

<details>
<summary><strong>Blender executable setup</strong></summary>

Blender 5.2 LTS is the validated runtime. Put `blender` on `PATH`, pass
`--blender` to benchmark commands, or set `BLENDER_EXECUTABLE`.

PowerShell:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

macOS or Linux:

```bash
export BLENDER_EXECUTABLE="/path/to/blender"
```

The executable resolver fails clearly when Blender cannot be found; the public
package contains no machine-specific installation path.

</details>

## Choose a workflow

| Goal | Skill |
| --- | --- |
| Build or substantially refine a model | [`blender-modeling-workflow`](https://skills.sh/ifBars/blender-agent-studio/blender-modeling-workflow) |
| Audit topology, hierarchy, export, or visual quality | [`blender-asset-validation`](https://skills.sh/ifBars/blender-agent-studio/blender-asset-validation) |
| Create or diagnose articulated mechanical motion | [`blender-animation-workflow`](https://skills.sh/ifBars/blender-agent-studio/blender-animation-workflow) |
| Measure baseline versus workflow quality | [`blender-agent-benchmark`](https://skills.sh/ifBars/blender-agent-studio/blender-agent-benchmark) |
| Choose or evaluate a Blender MCP | [`blender-mcp-integration`](https://skills.sh/ifBars/blender-agent-studio/blender-mcp-integration) |

<details>
<summary><strong>Command cookbook: modeling, validation, and benchmarks</strong></summary>

### Reproducible model

Ask the agent to deliver:

```text
create_asset.py
asset.blend
asset.glb
final_report.md
```

The Python script is the durable source. Generated files must be reproducible
from a clean Blender process.

### Headless Blender execution

```powershell
& $env:BLENDER_EXECUTABLE `
  --background --factory-startup --python .\create_asset.py
```

### Deterministic asset inspection

```powershell
& $env:BLENDER_EXECUTABLE `
  --background --factory-startup `
  --python ".\plugins\blender-agent-studio\skills\blender-asset-validation\scripts\inspect_asset.py" -- `
  --input ".\asset.glb" --output ".\evidence\metrics.json"
```

### Paired quick benchmark

Run each condition into a new output directory:

```powershell
cd .\plugins\blender-agent-studio
bun install

bun run benchmark --suite quick --mode baseline `
  --output C:\bench\baseline --blender $env:BLENDER_EXECUTABLE

bun run benchmark --suite quick --mode skills `
  --output C:\bench\skills --blender $env:BLENDER_EXECUTABLE
```

Run `skills_mcp` separately so MCP transport does not receive credit for skill
or prompt improvements.

</details>

## What you get

- Contract-first procedural modeling with semantic objects and materials
- Authored-scene and fresh-import geometry inspection
- Perspective, orthographic, contact-sheet, and critical-frame evidence
- Mechanical animation checks for pivots, supports, and connector endpoints
- Immutable benchmark runs with clean-source reproduction
- Hard-gate scoring plus blinded pairwise visual judging
- Separate baseline, skills, and skills-plus-MCP conditions
- A bounded MCP that cannot execute arbitrary Blender Python

<details>
<summary><strong>Plugin layout</strong></summary>

```text
SKILL.md
agents/openai.yaml
.agents/plugins/marketplace.json
plugins/blender-agent-studio/
  .codex-plugin/plugin.json
  .mcp.json
  assets/
  mcp/
  scripts/
  skills/
    blender-agent-benchmark/
    blender-animation-workflow/
    blender-asset-validation/
    blender-mcp-integration/
    blender-modeling-workflow/
```

The repository root is a Codex marketplace. The installable plugin lives under
`plugins/blender-agent-studio/`.

</details>

## Requirements

- Blender 5.2 LTS recommended
- Codex CLI with plugin marketplace support for the full installation
- Bun 1.3.5+ for the MCP, tests, and benchmark harness
- Python supplied by Blender for asset-generation and evaluation scripts

<details>
<summary><strong>Development and validation</strong></summary>

Install dependencies and run the same checks used by GitHub Actions:

```bash
bun install --cwd plugins/blender-agent-studio
bun run check
bun run test
```

The checks validate marketplace and plugin metadata, interface assets, skill
frontmatter, bounded MCP discovery, and benchmark scoring.

Generated models, exports, renders, benchmark runs, and agent traces are
excluded from source control.

</details>

## Validated benchmark snapshot

The July 2026 snapshot used Blender 5.2.0 LTS, Codex CLI 0.145.0, and
`gpt-5.6-terra` at medium reasoning.

| Task | Deterministic result | Blinded visual result |
| --- | --- | --- |
| Signal lantern smoke | Both 100; both pass | Plugin 1–0 |
| Tabletop press | Both 100; both pass | Plugin 3–0 |
| Revised winch drawbridge | Both 100; both pass | Plugin 3–0 |
| Foot-pump holdout | Plugin 100/pass; baseline 91/fail | Plugin 3–0 |

The final plugin runs received 10 of 10 blinded preference votes with no
hard-gate regression. They averaged about 48% longer because they performed
their own validation and evidence work.

This is directional evidence from one selected generation per condition—not a
universal claim across prompts, models, styles, or random variation. See the
[methodology](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md)
and [validated result](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/validated-results.md).

## Security

Blender executes Python with the current user's permissions. Review untrusted
scripts and `.blend` files before execution. The bundled MCP deliberately
exposes version, inspection, and evidence-render tools instead of generic
arbitrary Python.

Do not commit private models, generated renders, benchmark traces, or sensitive
prompts. See [SECURITY.md](SECURITY.md).

## License and trademarks

The project source is available under the [MIT License](LICENSE).

Blender and the Blender logo are trademarks of the Blender Foundation. This
project integrates with Blender but is not affiliated with or endorsed by the
Blender Foundation. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
