# Security

## Blender execution

Blender Agent Studio invokes a local Blender executable and runs Python scripts
inside Blender. Review untrusted scripts before execution. The bundled MCP is
intentionally limited to bounded jobs such as version checks, asset inspection,
and evidence renders. It exposes one arbitrary-Python tool,
`blender_live_run_python`, which runs a script file in an open Blender session
to edit the scene. The Studio Live addon refuses it unless the user ticks
**Allow Live Edits** in Blender's Agent Studio sidebar. The setting is off by
default, is not saved, and is checked on every request. While it is on, any
local process that can read the connection descriptor can run Python in that
Blender session with the user's permissions; save your work first and turn it
off when you are done.

Set `BLENDER_EXECUTABLE` only to a trusted Blender installation. Avoid running
untrusted `.blend` files with automatic script execution enabled.

## Generated artifacts

Models, exports, renders, benchmark prompts, agent traces, and evaluation output
can contain private source material. They are ignored by default and should be
reviewed before sharing.

## Documentation publishing

The documentation builder renders repository-owned Markdown, including raw HTML.
Treat changes to `site/content` as website code and review them before merging;
the builder is not a sandbox for untrusted or visitor-submitted content. It does
not fetch external Markdown or accept visitor content.

The `github-pages` environment must restrict deployments to the `main` branch,
including manually dispatched workflow runs. Keep that restriction when changing
repository settings.

## Reporting issues

Open a GitHub issue with a minimal reproduction. Do not include credentials,
private assets, proprietary models, or sensitive agent traces.
