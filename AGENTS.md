# Repository Instructions

- Use Bun for package scripts and dependency management.
- Run `bun run test` after changing TypeScript, MCP, scoring, or benchmark code.
- Run `bun run check` after changing plugin metadata, skills, marketplace files, or documentation.
- Run `bun run docs:test` and `bun run docs:build` after changing `site/`, skills, or MCP tools. Document new skills and tools in `site/content`.
- Keep the plugin name aligned across `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, the plugin folder, `.codex-plugin/plugin.json`, and `.claude-plugin/plugin.json`.
- Keep Codex and Claude Code support together: when changing the version, description, or MCP server entry, update both manifests.
- Do not commit generated Blender models, exports, renders, benchmark runs, agent traces, or local `.tmp` output.
- Keep Blender execution bounded. Do not add a generic arbitrary-Python MCP tool. The one exception is `blender_live_run_python`, which edits the open scene and must stay refused unless the user ticks Allow Live Edits in the Blender addon; do not add a second path around that switch.
- Treat one benchmark generation per condition as directional evidence, not a universal capability claim.
