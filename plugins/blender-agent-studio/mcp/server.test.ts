import { afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {mkdtemp, writeFile, rm, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
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
      expect(client.getServerVersion()?.version).toBe(JSON.parse(await readFile(join(root,'.codex-plugin/plugin.json'),'utf8')).version);

      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
        "blender_compare_reference",
        "blender_compare_scenes",
        "blender_describe_scene",
        "blender_diagnose_topology",
        "blender_download_polyhaven_asset",
        "blender_fit_reference_camera",
        "blender_inspect_asset",
        "blender_quality_report",
        "blender_render_evidence",
        "blender_render_scene",
        "blender_search_polyhaven_assets",
        "blender_version",
      ]);
      const renderSchema = listed.tools.find((tool) => tool.name === "blender_render_evidence")!.inputSchema;
      // Codex's tool schema parser requires homogeneous array items, not tuple-schema arrays.
      const qualitySchema = listed.tools.find(tool => tool.name === 'blender_quality_report')!.inputSchema;
      const diffSchema = listed.tools.find(tool => tool.name === 'blender_compare_scenes')!.inputSchema;
      expect((qualitySchema.properties?.contactPairs as any).items.items).toEqual({type: 'string'});
      expect((qualitySchema.properties?.contactPairs as any).items.minItems).toBe(2);
      expect((qualitySchema.properties?.connectionPoints as any).items.properties.pointA.items.type).toBe("number");
      expect(diffSchema.properties?.invariantObjects).toMatchObject({default: [], maxItems: 2048});
      expect(diffSchema.properties?.forbidNewTopologyFindings).toMatchObject({default: false});
      expect(renderSchema.properties?.presentation).toMatchObject({
        enum: ["auto", "neutral", "dark", "light"], default: "auto",
      });
      const authored = listed.tools.find((tool) => tool.name === "blender_render_scene")!.inputSchema;
      expect(authored.properties?.denoise).toMatchObject({enum: ["preserve", "preview", "final", "off"], default: "preserve"});
      expect(authored.properties?.inspectOnly).toMatchObject({default: false});
      expect(authored.properties?.maxEdge).toMatchObject({maximum: 4096});
      const invalid = await client.callTool({ name: "blender_render_scene", arguments: {
        assetPath: "missing.blend", outputDir: "unused", cameras: ["A", "B", "C"], frames: [1,2,3,4,5],
      }});
      expect(invalid.isError).toBe(true);
      expect(JSON.stringify(invalid.content)).toContain("12 camera/frame");

      const blenderPath =
        process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
      if (blenderPath) {
        const version = await client.callTool({
          name: "blender_version",
          arguments: { blenderPath },
        });
        expect(version.isError).not.toBe(true);
        expect(JSON.stringify(version.content)).toContain("Blender");
        const temporary = await mkdtemp(join(tmpdir(), 'bas-stale-metrics-'));
        try {
          const outputJson = join(temporary,'metrics.json');
          await writeFile(outputJson, JSON.stringify({stale:true}));
          const failed = await client.callTool({name:'blender_inspect_asset', arguments:{
            assetPath:join(temporary,'missing.blend'), outputJson, blenderPath,
          }});
          expect(failed.isError).toBe(true);
          expect((failed.structuredContent as any).metrics).toBe(null);
        } finally {await rm(temporary,{recursive:true,force:true});}
      }
    },
    30_000,
  );
});
