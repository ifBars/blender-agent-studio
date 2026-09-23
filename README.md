# Blender Agent Studio

Describe what you want to make. Keep the Blender file and the Python that built it.

A Codex plugin for creating and refining Blender models, animations, and scenes.
It gives your agent a way to plan the work, build it in your local Blender
installation, and inspect the result before delivery.

[Install](#install) · [Try it](#try-it) · [How it works](#how-it-works) · [Workflows](plugins/blender-agent-studio/skills) · [Development](docs/development.md) · [Report a bug](https://github.com/ifBars/blender-agent-studio/issues)

## What you can do

- Build props, environments, characters, and Geometry Nodes setups.
- Gather references from several angles and compare the model's proportions before adding detail.
- Overlay projected geometry on a reference image, with optional silhouette-mask measurements for missing and excess coverage. See [reference modeling](docs/reference-modeling.md).
- Rig and animate models, or work with cloth, smoke, and other simulations.
- Render through your scene's cameras with its lighting intact, or use studio views to inspect a model from every side.
- Download CC0 textures and HDRIs from Poly Haven at 1K, 2K, 4K, or 8K.
- Find Mixamo motion through your browser and import downloaded FBX animations into a new `.blend`. See the [Mixamo workflow](plugins/blender-agent-studio/skills/blender-animation-workflow/references/mixamo.md) for browser requirements and retargeting limits.
- Check geometry and exported files, review renders, and repair what doesn't work.
- Query scene parts and evaluated dimensions, check explicit geometry and ground constraints, and compare repairs against preserved SceneIR baselines with the optional Rust runtime.

The plugin includes eleven specialist skills and a local MCP server for
inspection, rendering, and asset downloads. Generated scenes come with Python
source so you can rebuild them and keep making changes.

## How it works

The skills guide the agent through modeling, rendering, animation, and other
tasks. Blender runs locally to build or inspect the saved scene; you do not need
to keep its interface open. The agent can render views, check the `.blend` and
any requested export, and revise the source when something needs work.

The `.blend` is the editable result. The Python source records the build steps,
so you can regenerate it or ask the agent to change it later. The [workflow
guide](SKILL.md#route-the-request) explains which specialist skills apply to
each kind of task.

## Install

You'll need Codex with plugin support, [Bun](https://bun.sh), and Blender.
Blender 5.2 LTS is the tested version; use Bun 1.3.5 or newer.

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Put `blender` on your `PATH`, or set `BLENDER_EXECUTABLE` to its location.
For example, in PowerShell:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

Start a new Codex task after installing or updating the plugin.

For the optional scene-understanding tools, build the Rust runtime in the
installed plugin directory with `bun run setup:runtime`. See
[scene understanding](docs/scene-understanding.md) for setup, examples and
measurement limits. The existing tools do not require Rust.

<details>
<summary>Update an existing GitHub installation</summary>

```bash
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

</details>

Prefer skills only? See the [alternative installation options](docs/development.md#skills-only-installation).

## Try it

> Use Blender Agent Studio to build a walnut desk lamp. Give it warm lighting,
> render it from two angles, and save the .blend and Python source.

Include the style, dimensions, and intended use when they matter. For a game
asset, ask for a GLB export and a check that it imports correctly. For a render,
you can specify a camera angle, lighting, or reference image.

You can also give the agent an existing `.blend` and ask it to inspect or refine
the scene. For a second review, ask it to check the result from multiple views.

## How well does it work?

It can produce editable Blender scenes, renders, and exports, then inspect and
revise them. The result depends on the model, the brief, and the scene. Expect
to review the work from several angles and request changes when the shape,
materials, motion, or simulation need to be right.

File checks can catch technical problems, but a valid `.blend` or export does
not mean the asset looks right. Visual comparisons so far have had mixed
results, so we cannot claim the plugin consistently improves the finished
work. See [quality development and evidence limits](docs/quality-development.md)
and the [benchmark methodology](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md).

## Star history

<a href="https://www.star-history.com/?repos=ifBars%2Fblender-agent-studio&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ifBars/blender-agent-studio&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ifBars/blender-agent-studio&type=date&legend=top-left" />
    <img alt="Blender Agent Studio star history chart" src="https://api.star-history.com/chart?repos=ifBars/blender-agent-studio&type=date&legend=top-left" />
  </picture>
</a>

## Contributing

Found a bug? [Open an issue](https://github.com/ifBars/blender-agent-studio/issues)
with your Blender version, what you asked for, and what happened. A render or
error log helps.

For code changes, see the [development guide](docs/development.md) and
[repository instructions](AGENTS.md). Keep generated models and benchmark output
out of commits. Review unfamiliar Blender scripts before running them; see
[security notes](SECURITY.md).

## Credits and license

[MIT](LICENSE). Powered by [Poly Haven](https://polyhaven.com), whose assets are
[CC0](https://polyhaven.com/license).

This is an independent project, not affiliated with or endorsed by the Blender
Foundation or Poly Haven. See [third-party notices](THIRD_PARTY_NOTICES.md).
