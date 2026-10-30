import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collectMotionRenders, motionRenderErrors, MOTION_VIEWS } from "./motion-render-evidence.ts";
import { renderEvidence } from "./run_benchmark.ts";
import { runBlender } from "../../../scripts/blender-process.ts";

test("motion judging rejects legacy, missing-view, and wrong-frame render evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bas-motion-manifest-"));
  try {
    expect(motionRenderErrors(undefined).length).toBeGreaterThan(0);
    expect((await collectMotionRenders(dir, [1, 2])).errors.length).toBeGreaterThan(0);
    const image = join(dir, "sample.png");
    await writeFile(image, "fixture");
    const report = { animation_views: Object.fromEntries(MOTION_VIEWS.map(view => [view, {
      frames: [1, 2].map(frame => ({ frame, path: image })), contact_sheet: image,
    }])) };
    await writeFile(join(dir, "evidence.json"), JSON.stringify(report));
    expect(motionRenderErrors(await collectMotionRenders(dir, [1, 2]))).toEqual([]);
    expect((await collectMotionRenders(dir, [1, 3])).errors).toHaveLength(3);
    delete report.animation_views.back;
    await writeFile(join(dir, "evidence.json"), JSON.stringify(report));
    expect((await collectMotionRenders(dir, [1, 2])).errors).toEqual(["Missing or incomplete back motion renders"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!blender)("native and fresh GLB renders preserve perspective and add side/rear motion samples", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bas-motion-render-"));
  try {
    const script = join(dir, "fixture.py");
    await writeFile(script, `import bpy,sys\nfrom pathlib import Path\np=Path(sys.argv[-1])\nbpy.ops.wm.read_factory_settings(use_empty=True)\nbpy.ops.mesh.primitive_cube_add(size=1)\no=bpy.context.object\no.location.x=-.5\no.keyframe_insert('location',frame=1)\no.location.x=.5\no.keyframe_insert('location',frame=2)\nbpy.context.scene.frame_end=2\nbpy.context.scene.frame_set(1)\nbpy.ops.wm.save_as_mainfile(filepath=str(p/'asset.blend'))\nbpy.ops.export_scene.gltf(filepath=str(p/'asset.glb'),export_format='GLB')\n`);
    const created = await runBlender({ blenderPath: blender!, scriptPath: script, scriptArgs: [dir], timeoutMs: 30_000 });
    expect(created.exitCode, created.stdout + created.stderr).toBe(0);
    for (const format of ["blend", "glb"]) {
      const outputDir = join(dir, format);
      await renderEvidence({ assetPath: join(dir, `asset.${format}`), outputDir, frames: [1, 2], motionViews: true,
        resolution: 128, blenderPath: blender! });
      const report = await collectMotionRenders(outputDir, [1, 2]);
      expect(report.errors, await readFile(join(outputDir, "render-process.json"), "utf8")).toEqual([]);
      expect(Object.keys(report.sheets)).toEqual([...MOTION_VIEWS]);
      for (const view of MOTION_VIEWS) {
        const prefix = view === "perspective" ? "" : `${view}_`;
        expect(await readFile(join(outputDir, `${prefix}frame_0001.png`))).not.toEqual(await readFile(join(outputDir, `${prefix}frame_0002.png`)));
      }
    }
    const regressions = await runBlender({ blenderPath: blender!, scriptPath: resolve(import.meta.dir, "../../blender-asset-validation/scripts/test_review_regressions.py"), timeoutMs: 30_000 });
    expect(regressions.exitCode, regressions.stdout + regressions.stderr).toBe(0);
    expect(regressions.stderr).toContain("OK");
    expect(regressions.stderr).not.toContain("skipped=");
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 240_000);
