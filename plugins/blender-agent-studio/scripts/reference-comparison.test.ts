import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { runBlender } from "./blender-process.ts";

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
const root = resolve(import.meta.dir, "..");

const fixtureScript = String.raw`
import bpy
import os
import sys

out = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.object
cube.name = "ReferenceCube"

bpy.ops.object.camera_add(location=(0, -10, 0), rotation=(1.57079632679, 0, 0))
camera = bpy.context.object
camera.name = "ReferenceCamera"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 4
bpy.context.scene.camera = camera
bpy.context.scene.render.resolution_x = 64
bpy.context.scene.render.resolution_y = 64
bpy.context.scene.render.resolution_percentage = 100
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "matching.blend"))

cube.scale.x = 1.5
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "wide.blend"))

pixels = []
for y in range(64):
    for x in range(64):
        foreground = 16 <= x < 48 and 16 <= y < 48
        value = 1.0 if foreground else 0.0
        pixels.extend((value, value, value, 1.0))

for name in ("reference", "mask"):
    image = bpy.data.images.new(name, width=64, height=64, alpha=True)
    image.pixels = pixels
    image.filepath_raw = os.path.join(out, name + ".png")
    image.file_format = "PNG"
    image.save()
`;

test.skipIf(!blender)("MCP reference comparison renders the authored camera, scopes outputs, and preserves its source", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bas-reference-comparison-test-"));
  const client = new Client({ name: "bas-reference-comparison-test", version: "1" });
  try {
    const scriptPath = join(temporary, "fixture.py");
    await writeFile(scriptPath, fixtureScript);
    const built = await runBlender({ blenderPath: blender!, scriptPath, scriptArgs: [temporary], timeoutMs: 10_000 });
    expect(built.exitCode, built.stderr + built.stdout).toBe(0);

    const matchingAsset = join(temporary, "matching.blend");
    const wideAsset = join(temporary, "wide.blend");
    const referencePath = join(temporary, "reference.png");
    const maskPath = join(temporary, "mask.png");
    const digest = (path: string) => readFile(path).then(file => createHash("sha256").update(file).digest("hex"));
    const matchingDigest = await digest(matchingAsset);
    const wideDigest = await digest(wideAsset);

    await client.connect(new StdioClientTransport({ command: "bun", args: [join(root, "mcp/server.ts")], cwd: root, stderr: "pipe" }));
    const compare = async (assetPath: string, outputDir: string, mask = true) =>
      await client.callTool({ name: "blender_compare_reference", arguments: {
        assetPath, referencePath, ...(mask ? { maskPath } : {landmarks: [
          {name: "center", objectName: "ReferenceCube", referenceUv: [0.25, 0.5]},
        ]}), outputDir, blenderPath: blender, maxEdge: 128, timeoutMs: 10_000,
      } });

    const matchingDir = join(temporary, "matching-output");
    const matching = await compare(matchingAsset, matchingDir);
    expect(matching.isError, JSON.stringify(matching.content)).not.toBe(true);
    expect((matching._meta as any)?.["blender/viewer"].images.length).toBe(2);
    const matchingResult = matching.structuredContent as any;
    expect(matchingResult.report.scope).toBe("projected_geometry_reference_comparison");
    expect(matchingResult.report.source).toBe(resolve(matchingAsset));
    expect(matchingResult.report.reference).toBe(resolve(referencePath));
    expect(matchingResult.report.comparison).toBe(resolve(matchingDir, "comparison.png"));
    expect(matchingResult.report.overlay).toBe(resolve(matchingDir, "overlay.png"));
    for (const name of ["reference.png", "silhouette.png", "overlay.png", "comparison.png", "comparison.json"]) {
      expect(existsSync(join(matchingDir, name)), `missing ${name}`).toBe(true);
    }
    const matchingReport = JSON.parse(await readFile(join(matchingDir, "comparison.json"), "utf8"));
    expect(matchingReport.reference).toBe(resolve(referencePath));
    expect(matchingReport.source_sha256).toBe(matchingDigest);
    expect(matchingReport.metrics.iou).toBeGreaterThan(0.98);
    expect(matchingReport.metrics.reference_pixels).toBe(1024);
    expect(await digest(matchingAsset)).toBe(matchingDigest);

    const wide = await compare(wideAsset, join(temporary, "wide-output"));
    expect(wide.isError, JSON.stringify(wide.content)).not.toBe(true);
    const wideReport = JSON.parse(await readFile(join(temporary, "wide-output", "comparison.json"), "utf8"));
    expect(matchingReport.metrics.iou).toBeGreaterThan(wideReport.metrics.iou);
    expect(await digest(wideAsset)).toBe(wideDigest);

    const noMask = await compare(matchingAsset, join(temporary, "no-mask-output"), false);
    expect(noMask.isError, JSON.stringify(noMask.content)).not.toBe(true);
    const noMaskReport = JSON.parse(await readFile(join(temporary, "no-mask-output", "comparison.json"), "utf8"));
    expect(noMaskReport.metrics).toBeNull();
    expect(noMaskReport.landmarks[0].delta_pixels[0]).toBeCloseTo(16, 3);
    expect(noMaskReport.landmarks[0].delta_pixels[1]).toBeCloseTo(0, 3);
    expect(noMaskReport.landmarks[0].error_pixels).toBeCloseTo(16, 3);
    expect(noMaskReport.landmarks[0].visibility).toBe('not_tested_for_occlusion');

    const occupied = await compare(matchingAsset, matchingDir);
    expect(occupied.isError).toBe(true);
    expect(JSON.stringify(occupied.content)).toContain("new or empty");
  } finally {
    await client.close();
    await rm(temporary, { recursive: true, force: true });
  }
}, 30_000);
