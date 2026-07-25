# Blender Agent Studio

Blender Agent Studio is a global Codex plugin for reproducible Blender 5.2
modeling, technical and visual validation, mechanical animation, MCP selection,
and paired agent benchmarking.

## What it provides

- `blender-modeling-workflow`: contract-first procedural modeling and
  iterative multiview review.
- `blender-asset-validation`: evaluated geometry inspection, fresh GLB import,
  and fixed evidence renders.
- `blender-animation-workflow`: critical-frame review, mechanical pivots, and
  dynamic-connector endpoint invariants.
- `blender-agent-benchmark`: isolated baseline/plugin runs, task gates,
  clean-source reproduction, rescoring, and blinded pairwise judging.
- `blender-mcp-integration`: guidance for Blender Lab MCP, the bundled bounded
  evaluator MCP, and optional community integrations.
- A local MCP with exact Blender version, asset inspection, and evidence render
  tools. It deliberately does not expose generic arbitrary Python execution.

## Use

Invoke the modeling skill in a fresh Codex task:

```text
$blender-agent-studio:blender-modeling-workflow Build a stylized game-ready
coffee grinder as create_asset.py, asset.blend, and asset.glb.
```

Add `$blender-agent-studio:blender-animation-workflow` for articulated assets
and `$blender-agent-studio:blender-asset-validation` for review-only work.

Run the benchmark from this plugin directory with Bun:

```powershell
bun run benchmark --suite quick --mode baseline --output C:\bench\baseline
bun run benchmark --suite quick --mode skills --output C:\bench\skills
```

Every output directory must be new so raw traces and artifacts remain
immutable. The automated score is structural; use the bundled blinded
comparison before making a visual-quality claim.

## MCP decision

Use Blender's official Lab MCP for live Blender interaction and bundled API
documentation. The local MCP is a deterministic evaluation convenience. The
quality benchmark is designed to work without MCP, and MCP should be evaluated
as its own condition rather than receiving credit for skill changes.

See `skills/blender-mcp-integration/references/mcp-options.md` for the researched
tradeoffs.
