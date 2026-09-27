# Security

## Blender execution

Blender Agent Studio invokes a local Blender executable and runs Python scripts
inside Blender. Review untrusted scripts before execution. The bundled MCP is
intentionally limited to version checks, asset inspection, and evidence renders;
it does not expose a generic arbitrary-Python tool.

Set `BLENDER_EXECUTABLE` only to a trusted Blender installation. Avoid running
untrusted `.blend` files with automatic script execution enabled.

## Generated artifacts

Models, exports, renders, benchmark prompts, agent traces, and evaluation output
can contain private source material. They are ignored by default and should be
reviewed before sharing.

## Reporting issues

Open a GitHub issue with a minimal reproduction. Do not include credentials,
private assets, proprietary models, or sensitive agent traces.
