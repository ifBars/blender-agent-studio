# Blender Agent Studio

Describe what you want to make. Keep the Blender file and the Python that built it.

A plugin for Codex and Claude Code for creating and refining Blender models,
animations, and scenes.
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
to keep its interface open. The agent chooses the relevant steps for your
request. The workflows and tools help it:

- Turn the brief into parts, proportions, finish goals, and delivery checks.
  Review a graybox before spending time on materials and small details.
- Check geometry, materials, dimensions, and other scene details. For an export,
  it can reopen the file in a fresh Blender process to check what survived.
- Render a hero view plus fixed front, back, left, right, and top views. During
  repairs, it can use two smaller views for faster feedback before the full check.
- Light diagnostic views with a studio setup scaled to the asset. The `auto`
  preset picks a contrasting background from simple material color hints; the
  agent still needs to inspect the image and adjust it when the choice fails.
- Render through the scene's own cameras and lighting for beauty images. The
  tool caps resolution, samples, and render time. It offers faster `preview`
  and higher-quality `final` denoising policies; by default, it preserves the
  scene's authored denoising settings. The agent selects the policy for the job.

The `.blend` is the editable result. The Python source records the build steps,
so you can regenerate it or ask the agent to change it later. The [workflow
guide](SKILL.md#route-the-request) explains which specialist skills apply to
each kind of task. Studio views are for inspection and do not replace your
scene's authored lighting in beauty renders.

## Install

You'll need [Codex](https://developers.openai.com/codex) or [Claude
Code](https://code.claude.com) with plugin support, [Bun](https://bun.sh), and
Blender. Blender 5.2 LTS is the tested version; use Bun 1.3.5 or newer. Both
hosts install the same skills, MCP server, and SceneIR tools from this
repository.

**Codex**

```bash
codex plugin marketplace add ifBars/blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

**Claude Code**

```bash
claude plugin marketplace add ifBars/blender-agent-studio
claude plugin install blender-agent-studio@blender-agent-studio
```

Inside a Claude Code session, `/plugin marketplace add ifBars/blender-agent-studio`
and `/plugin install blender-agent-studio@blender-agent-studio` do the same.

Put `blender` on your `PATH`, or set `BLENDER_EXECUTABLE` to its location.
For example, in PowerShell:

```powershell
$env:BLENDER_EXECUTABLE = "C:\path\to\Blender\blender.exe"
```

Start a new Codex task or Claude Code session after installing or updating the
plugin. In Codex, invoke a skill as `$blender-agent-studio:blender-modeling-workflow`;
in Claude Code, as `/blender-agent-studio:blender-modeling-workflow`. Both hosts
also pick the relevant skill from a plain request.

For the optional scene-understanding tools, build the Rust runtime in the
installed plugin directory with `bun run setup:runtime`. See
[scene understanding](docs/scene-understanding.md) for setup, examples and
measurement limits. The existing tools do not require Rust.

<details>
<summary>Update an existing GitHub installation</summary>

Codex:

```bash
codex plugin marketplace upgrade blender-agent-studio
codex plugin add blender-agent-studio@blender-agent-studio
```

Claude Code:

```bash
claude plugin marketplace update blender-agent-studio
claude plugin update blender-agent-studio@blender-agent-studio
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

In five fresh, matched pairs covering a lantern, lever press, and animated
drawbridge, the plugin's guided workflow passed the technical gate five times;
the agent without it failed five times. Three blinded visual judges preferred
the plugin asset in four of the five pairs. On one lantern repeat, all three
preferred the baseline's appearance even though its geometry failed the
technical gate. The plugin used more reported tokens. Lantern build time was
about even across three pairs; the press and drawbridge plugin runs took about
twice as long. See the [current paired evidence](docs/plugin-quality-evidence.md)
for scores, controls, and defects.

These results show a quality gain for delivery checks on the tested prompts,
with less consistent visual gains. Five pairs cannot give a reliable success
rate for arbitrary prompts, models, or art styles. The three judges in each
pair reviewed the same two assets; their votes are not separate generations.
The comparison used the plugin's skills without its optional MCP tools, so it
does not measure the extra benefit of those tools. An [earlier four-task
comparison](plugins/blender-agent-studio/skills/blender-agent-benchmark/references/validated-results.md)
also favored the plugin's final runs, but a harder integrated task had mixed
results. Plugin revisions have shown [both gains and
regressions](docs/quality-development.md). Review the result yourself,
particularly its shape, materials, animation, and exported files.

All of these measurements ran the agent in Codex. Claude Code loads the same
skills and MCP tools, but its results have not been measured, so do not read
these results as evidence for Claude Code.

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
