import { afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe("Blender Agent Studio MCP", () => {
  test(
    "lists its bounded tools and verifies Blender when available",
    async () => {
      const root = join(dirname(fileURLToPath(import.meta.url)), "..");
      client = new Client({ name: "blender-agent-studio-test", version: "1.0.0" });
      const transport = new StdioClientTransport({
        command: "bun",
        args: [join(root, "mcp", "server.ts")],
        cwd: root,
        stderr: "pipe",
      });
      await client.connect(transport);

      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
        "blender_inspect_asset",
        "blender_render_evidence",
        "blender_version",
      ]);

      const blenderPath =
        process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
      if (blenderPath) {
        const version = await client.callTool({
          name: "blender_version",
          arguments: { blenderPath },
        });
        expect(version.isError).not.toBe(true);
        expect(JSON.stringify(version.content)).toContain("Blender");
      }
    },
    30_000,
  );
});
