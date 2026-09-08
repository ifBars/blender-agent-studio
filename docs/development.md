# Development and setup

The repository is a Codex marketplace. The plugin lives in
`plugins/blender-agent-studio`; the root `SKILL.md` routes skills-only requests.

## Local checks

Run these commands from the repository root:

```bash
bun install --cwd plugins/blender-agent-studio
bun run check
bun run test
bun run test:python
```

Set `BLENDER_EXECUTABLE` or put Blender on `PATH` to run the live Blender tests.
Without Blender, the Python suite skips those tests and runs the settings tests.

After editing `plugins/blender-agent-studio/references/astra-workflow.md`, run:

```bash
bun tools/sync-guidance.ts
bun run check
```

Each specialist skill bundles that guidance. The check rejects stale copies.
Generated models, exports, renders, benchmark runs, and agent traces stay outside
source control.

## Skills-only installation

Install the umbrella skill:

```bash
bunx skills add -g ifBars/blender-agent-studio --skill blender-agent-studio --agent codex -y
```

Or install the umbrella and all eleven specialist skills:

```bash
bunx skills add -g ifBars/blender-agent-studio --skill "*" --agent codex --full-depth -y
```

This route installs skills without the MCP server or plugin presentation metadata.

## Blender setup

On macOS or Linux, set the executable path with:

```bash
export BLENDER_EXECUTABLE="/path/to/blender"
```

Benchmark commands also accept `--blender`. The MCP tools accept `blenderPath`.
See the [MCP integration guide](../plugins/blender-agent-studio/skills/blender-mcp-integration/SKILL.md)
for tool setup and alternatives.

## Scripts and benchmarks

- [Asset validation](../plugins/blender-agent-studio/skills/blender-asset-validation/SKILL.md): inspect source files and fresh imports, then render comparison views.
- [Rendering](../plugins/blender-agent-studio/skills/blender-rendering-workflow/SKILL.md): render authored cameras, inspect dependencies, and download Poly Haven assets.
- [Benchmarking](../plugins/blender-agent-studio/skills/blender-agent-benchmark/SKILL.md): run isolated comparisons with fixed models, settings, and visual judging.

The benchmark profiles `astra`, `sol`, `terra`, and `luna` default to medium
reasoning effort. Keep the historical `full` suite separate from the optional
challenge and gauntlet suites. Compare revisions with `--require-non-regression`;
a win on one task does not cancel a regression on another.

Read the [July 2026 results](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/validated-results.md)
and [0.6 Astra results](../plugins/blender-agent-studio/skills/blender-agent-benchmark/references/astra-0.6-validation.md)
with their methodology limits. Neither establishes a general model ranking.
