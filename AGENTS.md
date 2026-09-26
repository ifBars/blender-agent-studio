# Repository Instructions

- Use Bun for package scripts and dependency management.
- Run `bun run test` after changing TypeScript, MCP, scoring, or benchmark code.
- Run `bun run check` after changing plugin metadata, skills, marketplace files, or documentation.
- Keep the plugin name aligned across `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, the plugin folder, `.codex-plugin/plugin.json`, and `.claude-plugin/plugin.json`.
- Keep Codex and Claude Code support together: when changing the version, description, or MCP server entry, update both manifests.
- Do not commit generated Blender models, exports, renders, benchmark runs, agent traces, or local `.tmp` output.
- Keep Blender execution bounded. Do not add a generic arbitrary-Python MCP tool.
- Treat one benchmark generation per condition as directional evidence, not a universal capability claim.
