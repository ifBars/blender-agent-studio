import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { runBlender } from "./blender-process.ts";

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!blender)("focused underside evidence preserves the source and reports its limited scope", async () => {
  const root = resolve(import.meta.dir, "..");
  const temporary = await mkdtemp(join(tmpdir(), "bas-focus-test-"));
  const client = new Client({ name: "focus-test", version: "1" });
  try {
    const script = join(temporary, "fixture.py");
    const asset = join(temporary, "asset.blend");
    await writeFile(script, `import bpy,sys\nbpy.ops.wm.read_factory_settings(use_empty=True)\nbpy.ops.mesh.primitive_cube_add(size=1)\nbpy.context.object.name='Joint'\nbpy.ops.mesh.primitive_cube_add(size=0.2,location=(0.6,0,0))\nbpy.context.object.name='Neighbor'\nbpy.ops.wm.save_as_mainfile(filepath=sys.argv[-1])\n`);
    expect((await runBlender({ blenderPath: blender!, scriptPath: script, scriptArgs: [asset] })).exitCode).toBe(0);
    const before = await readFile(asset);
    await client.connect(new StdioClientTransport({ command: "bun", args: [join(root, "mcp/server.ts")], cwd: root, stderr: "pipe" }));
    const outputDir = join(temporary, "evidence");
    const result = await client.callTool({ name: "blender_render_evidence", arguments: {
      assetPath: asset, outputDir, blenderPath: blender, views: ["bottom", "front"], focusObjects: ["Joint"], resolution: 128, presentation: "neutral", timeoutMs: 120_000,
    } });
    expect(result.isError, JSON.stringify(result.content).slice(0, 1200)).not.toBe(true);
    const manifest = JSON.parse(await readFile(join(outputDir, "evidence.json"), "utf8"));
    expect(manifest.evidence_scope).toBe("detail_preview");
    expect(manifest.focus_objects).toEqual(["Joint"]);
    expect(manifest.geometry_hidden_for_focus).toBe(false);
    expect(manifest.underside_floor_hidden).toBe(true);
    expect(await readFile(asset)).toEqual(before);
    const invalid = await client.callTool({ name: "blender_render_evidence", arguments: {
      assetPath: asset, outputDir: join(temporary, "invalid"), blenderPath: blender,
      focusObjects: ["Missing"], resolution: 128,
    } });
    expect(invalid.isError).toBe(true);
  } finally { await client.close(); await rm(temporary, { recursive: true, force: true }); }
}, 180_000);
