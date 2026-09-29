---
title: Contributing
description: Report bugs, run the checks, and keep generated output out of commits.
---

## Report a bug

[Open an issue](https://github.com/ifBars/blender-agent-studio/issues) with your Blender version, what you asked for, and what happened. A render or an error log helps. Leave out credentials, private assets, and sensitive agent traces.

## Run the checks

From the repository root:

```bash
bun install --cwd plugins/blender-agent-studio
bun run check
bun run test
bun run test:python
```

Set `BLENDER_EXECUTABLE` or put Blender on `PATH` to include the live Blender tests. For the Rust tests, build the runtime first:

```bash
bun --cwd plugins/blender-agent-studio run setup:runtime
bun --cwd plugins/blender-agent-studio run test:runtime
```

After editing `references/astra-workflow.md`, run `bun tools/sync-guidance.ts` to update the copy bundled with each skill.

## Work on these docs

The site lives in `site/`. Pages are Markdown files in `site/content`, and a small Bun and TypeScript builder in `site/src` turns them into static HTML.

```bash
bun install --cwd site
bun run docs:dev     # http://localhost:4321, reloads on save
bun run docs:build   # writes site/dist
```

The build fails if a skill or MCP tool is missing from these pages, or if a link points to a page or heading that doesn't exist. Pushes to `main` deploy the site to GitHub Pages.

## Ground rules

- Don't commit generated models, exports, renders, benchmark runs, or agent traces.
- Keep Blender execution bounded. Don't add a generic arbitrary-Python MCP tool.
- Treat one benchmark generation per condition as directional evidence, not a capability claim.

The [development guide](https://github.com/ifBars/blender-agent-studio/blob/main/docs/development.md) covers benchmarks and more setup detail.
