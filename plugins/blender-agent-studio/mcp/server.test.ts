import { afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {mkdtemp, writeFile, rm, readFile, chmod} from "node:fs/promises";
import {tmpdir} from "node:os";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

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
        "blender_check_setup",
        "blender_compare_reference",
        "blender_compare_scenes",
        "blender_describe_scene",
        "blender_diagnose_topology",
        "blender_download_polyhaven_asset",
        "blender_fit_reference_camera",
        "blender_get_preview",
        "blender_import_mixamo_animation",
        "blender_inspect_asset",
        "blender_inspect_motion",
        "blender_prepare_mixamo_search",
        "blender_prepare_pixabay_sound_search",
        "blender_quality_report",
        "blender_render_evidence",
        "blender_render_modeling_timelapse",
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
      expect((qualitySchema.properties?.contactPairs as any).items.maxItems).toBe(2);
      expect((qualitySchema.properties?.connectionPoints as any).items.properties.pointA.items.type).toBe("number");
      expect((qualitySchema.properties?.connectionPoints as any).items.properties.pointA).toMatchObject({minItems: 3, maxItems: 3});
      expect((qualitySchema.properties?.connectionPoints as any).items.properties.pointB).toMatchObject({minItems: 3, maxItems: 3});
      expect(diffSchema.properties?.invariantObjects).toMatchObject({default: [], maxItems: 2048});
      expect(diffSchema.properties?.forbidNewTopologyFindings).toMatchObject({default: false});
      expect(renderSchema.properties?.presentation).toMatchObject({
        enum: ["auto", "neutral", "dark", "light"], default: "auto",
      });
      const pixabay = await client.callTool({name: "blender_prepare_pixabay_sound_search", arguments: {query: "door slam"}});
      expect(pixabay.isError).not.toBe(true);
      expect(pixabay.structuredContent).toMatchObject({
        status: "browser_required",
        url: "https://pixabay.com/sound-effects/search/door%20slam/",
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

      const versionSchema = listed.tools.find(tool => tool.name === 'blender_version')!.inputSchema;
      expect(versionSchema.properties?.timeoutMs).toMatchObject({default: 10000, maximum: 30000});
      if (process.platform !== 'win32') {
        const temporary = await mkdtemp(join(tmpdir(), 'bas-version-failure-'));
        try {
          const fake = join(temporary, 'fake blender');
          for (const body of ['exit 7', 'echo not-blender', 'trap \'\' TERM\nexec sleep 30']) {
            await writeFile(fake, `#!/bin/sh\n${body}\n`);
            await chmod(fake, 0o755);
            const failure = await client.callTool({name: 'blender_version', arguments: {blenderPath: fake, timeoutMs: 1000}});
            expect(failure.isError).toBe(true);
            if (body.includes('sleep')) expect((failure.structuredContent as any).timedOut).toBe(true);
          }
          await chmod(fake, 0o644);
          const denied = await client.callTool({name: 'blender_version', arguments: {blenderPath: fake}});
          expect(denied.isError).toBe(true);
          expect(JSON.stringify(denied.content)).toContain('not executable');
          const setupFailure = await client.callTool({name: 'blender_check_setup', arguments: {blenderPath: fake, outputDir: join(temporary, 'setup')}});
          expect(setupFailure.isError).toBe(true);
          expect(setupFailure.structuredContent).toMatchObject({status: 'fail'});
        } finally { await rm(temporary, {recursive: true, force: true}); }
      }

      const blenderPath =
        process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
      if (blenderPath) {
        const version = await client.callTool({
          name: "blender_version",
          arguments: { blenderPath },
        });
        expect(version.isError).not.toBe(true);
        expect(JSON.stringify(version.content)).toContain("Blender");
        expect(version.structuredContent).toMatchObject({source: "argument"});
        const setupRoot = await mkdtemp(join(tmpdir(), 'bas-setup-tool-'));
        try {
          const setup = await client.callTool({name: 'blender_check_setup', arguments: {blenderPath, outputDir: join(setupRoot, 'check')}});
          expect(setup.isError).not.toBe(true);
          expect(setup.structuredContent).toMatchObject({status: 'pass'});
          expect((setup.structuredContent as any).checks.find((c: any) => c.name === 'host-integration').status).toBe('pass');
          expect((setup.content as any[]).some(item => item.type === 'image' && item.mimeType === 'image/png')).toBe(true);
        } finally { await rm(setupRoot, {recursive: true, force: true}); }
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
    120_000,
  );
});
