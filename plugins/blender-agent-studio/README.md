# Blender Agent Studio

Blender Agent Studio is a global Codex plugin for reproducible Blender 5.2
modeling, procedural systems, rendering, simulation, character work, technical
and visual validation, animation, MCP selection, and paired agent benchmarking.

## Astra adaptation

Version 0.5.0 also makes presentation adaptive by default. Evidence renders use
scale-correct soft lighting, close framing, and a contrasting studio floor.
The MCP accepts `presentation` and the renderer accepts `--presentation`, with
`auto`, `neutral`, `dark`, or `light`. Open the hero image and adapt the preset
when necessary. Provide two looks when they serve distinct needs. Benchmark
evidence pins `neutral`; settings version 2 must not be mixed with older renders
in a controlled comparison.

The workflows now support GPT-6 Astra's longer-task execution: routine brief
decisions use stated defaults, related modeling stages can share a build/review
pass, and long work keeps a compact checkpoint with source and evidence state.
Construction uses focused checks; completion still requires clean-source
reproduction, applicable fresh-import checks, and opened visual evidence.
The shared [execution guidance](references/astra-workflow.md) explains the
behavior and its source in OpenAI's Astra migration guide.

Select Astra in Codex to use it interactively; the plugin does not change your
model setting. Sol, Terra, and Luna remain supported. Model-specific Blender
quality or speed improvements have not yet been measured for this revision.

For explicit, reproducible model selection in the benchmark:

```powershell
bun run benchmark --profile astra --reasoning medium --suite smoke `
  --mode skills --condition-label astra-revised --output C:\bench\astra-revised
```

Profiles `astra`, `sol`, `terra`, and `luna` pin the corresponding model with
equal `medium` effort by default. Use `--reasoning` to preserve an existing
comparison's effort. Conflicting model/profile options and known unsupported
effort levels fail before launching work. Without a profile or explicit model,
the runner keeps the configured default. There is no automatic model fallback.
Measure skill changes on one fixed model before comparing different models.

## What it provides

- `blender-modeling-workflow`: contract-first procedural modeling and
  explicit graybox-to-polish stages with a smooth finished-quality default and
  iterative multiview review.
- `blender-asset-validation`: evaluated geometry inspection, fresh GLB import,
  and fixed evidence renders.
- `blender-iterative-refinement`: opt-in first-candidate, separate critic,
  targeted source repair, and same-evidence rollback gate.
- `blender-animation-workflow`: critical-frame review, mechanical pivots, and
  dynamic-connector endpoint invariants.
- `blender-procedural-workflow`: editable Geometry Nodes, modifiers,
  instancing, terrain, and generator validation.
- `blender-rendering-workflow`: reproducible lighting, camera, compositing,
  still, turntable, and sequence delivery.
- `blender-simulation-workflow`: controlled fluid, smoke, fire, rigid, cloth,
  particle, hair, and soft-body bakes with cache evidence.
- `blender-character-workflow`: character topology, armatures, skinning,
  deformation poses, actions, and fresh-import checks.
- `blender-agent-benchmark`: isolated baseline/plugin runs, task gates,
  clean-source reproduction, finish-profile controls, rescoring, and
  counterbalanced blinded pairwise judging with structured visual criteria,
  an unchanged regression anchor, and opt-in harder challenge tasks.
- `blender-mcp-integration`: guidance for Blender Lab MCP, the bundled bounded
  evaluator MCP, and optional community integrations.
- A local MCP with exact Blender version, asset inspection, and evidence render
  tools. It deliberately does not expose generic arbitrary Python execution.

## Inline render viewer

MCP Apps-compatible hosts can show a compact viewer for `blender_render_scene`,
`blender_render_evidence`, and `blender_compare_reference`: switch views,
inspect at 100% or fit, and expand render details. It follows the host theme and
fits narrow chat panels. No render controls or extra agent tools are required.

The UI is a self-contained `ui://` resource with bundled JavaScript and no remote
assets or network permissions. Up to 12 PNGs and 10 MB of image bytes are passed
in UI-only metadata, scoped to the completed output directory. Unavailable or
oversized images are noted. Agents keep structured results and the first inline
image; hosts without MCP Apps support keep that fallback. Preflight and errors
have explicit states. This is a viewer for completed results, not live render
progress or automatic refresh of files. The server bundles UI code on first
resource read using its existing Bun runtime.

## Denoising by render stage

`blender_render_scene` accepts `denoise: "preview"`, `"final"`, `"off"`, or
`"preserve"` (default). Preview favors supported GPU OIDN Fast, with OptiX/CPU
fallbacks. Final uses OIDN High/Accurate and supported GPU acceleration. The
manifest reports actual settings and decisions; authored compositor denoising
is preserved. Choose off for clean images and inspect detail before retaining
filtering. Sample caps do not increase automatically.

## Connection-point diagnostics

SceneIR quality reports accept explicit `connectionPoints` for cable ends,
pivots and other intended joints. Checks transform object-local anchors into
world space and return the gap plus correction direction, even when object
bounding boxes overlap. They preserve whole-assembly selection and pagination.
Anchor agreement requires visual verification and does not prove surface contact.

## Reference framing and repair diagnostics

`blender_fit_reference_camera` fits scale/focal length and lens shift from
explicit reference landmarks, saving a candidate scene without changing meshes
or camera pose. Review it with `blender_compare_reference` before retaining the
parameters. This measures framing error, not overall modeling quality.

`blender_diagnose_topology` locates degenerate faces and zero-length edges in
evaluated world space, with exact object names and bounded element findings.
Use these locations to target source repairs and recheck the exported asset.
Open boundaries are not automatically classified as defects.

## Scene understanding

The optional Rust runtime powers `blender_describe_scene`,
`blender_quality_report`, and `blender_compare_scenes`. With Rust installed, run
`bun run setup:runtime` from this directory, then start a new Codex task. Rebuild
after plugin updates, or set `BAS_RUNTIME_EXECUTABLE` to a compatible compiled
runtime. Existing tools do not require Rust.

Describe a scene first, then focus on an exact `objectId` and its descendants.
The report separates measured geometry constraints from required visual review.
After a repair, compare the preserved and regenerated assets to see structural
changes and enforce only contract-derived invariants. Bounds overlap is a
candidate, not a proven mesh intersection. See the
[SceneIR guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/scene-understanding.md)
for examples, setup and limits.

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
bun run benchmark --suite challenge --mode skills `
  --condition-label revised-plugin --output C:\bench\revised-challenge
bun run benchmark --suite gauntlet --mode skills `
  --condition-label candidate-gauntlet --output C:\bench\candidate-gauntlet
bun run benchmark --suite challenge `
  --tasks realistic_fire_lantern_showcase --mode skills `
  --condition-label cached-fire-lantern --output C:\bench\fire-lantern
```

Every output directory must be new so raw traces and artifacts remain
immutable. The automated score includes structural and finish-signal proxies;
use the bundled blinded comparison before making a visual-quality claim.
Use `compare_runs.ts --require-non-regression` when comparing a revision with
the current plugin; new challenge gains do not offset legacy regressions.
The realistic fire-lantern fixture additionally validates a 15-second, 24 fps
MP4 with `ffprobe` and preserves five sampled flame frames beside the six-view
contact sheet.

## MCP decision

Use Blender's official Lab MCP for live Blender interaction and bundled API
documentation. The local MCP is a deterministic evaluation convenience. The
quality benchmark is designed to work without MCP, and MCP should be evaluated
as its own condition rather than receiving credit for skill changes.

See `skills/blender-mcp-integration/references/mcp-options.md` for the researched
tradeoffs.
