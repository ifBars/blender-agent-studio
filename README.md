# Blender Agent Studio

Describe what you want to make. Keep the Blender file and the Python that built it.

A Codex plugin for creating and refining Blender models, animations, and scenes.
It gives your agent workflows for the creative work, plus tools to inspect assets,
render them, and find textures.

[Install](#install) · [Try it](#try-it) · [Workflows](plugins/blender-agent-studio/skills) · [Development](docs/development.md) · [Report a bug](https://github.com/ifBars/blender-agent-studio/issues)

## What you can do

- Build props, environments, characters, and Geometry Nodes setups.
- Rig and animate models, or work with cloth, smoke, and other simulations.
- Render through your scene's cameras with its lighting intact, or use studio views to inspect a model from every side.
- Download CC0 textures and HDRIs from Poly Haven at 1K, 2K, 4K, or 8K.
- Check geometry and exported files, review renders, and repair what doesn't work.

The plugin includes eleven specialist skills and a local MCP server for
inspection, rendering, and asset downloads. Generated scenes come with Python
source so you can rebuild them and keep making changes.

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

The [workflow guide](SKILL.md#route-the-request) covers modeling, rendering,
animation, characters, simulations, and more. You can also ask for a second
review of an existing scene.

## How well does it work?

The workflow includes visual review alongside file checks. Results still depend
on the model, the brief, and the scene.

In the 0.6 Astra tests, the revised workflow won the lantern comparison and lost
the workshop comparisons. See the [results and limits](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/astra-0.6-validation.md)
and [benchmark methodology](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/methodology.md).

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
