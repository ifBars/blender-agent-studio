import { test, expect } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBlender } from "./blender-process.ts";

const executable = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!executable)("Python errors propagate and factory startup does not replace a supplied blend", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bas-process-"));
  try {
    const source = join(dir, "fixture.blend");
    const build = join(dir, "build.py");
    await writeFile(build, `import bpy\nbpy.context.scene.name='Authored fixture'\nbpy.ops.wm.save_as_mainfile(filepath=${JSON.stringify(source)})\n`);
    expect((await runBlender({blenderPath: executable!, scriptPath: build})).exitCode).toBe(0);
    const inspect = join(dir, "check.py");
    await writeFile(inspect, "import bpy\nassert bpy.context.scene.name == 'Authored fixture'\n");
    expect((await runBlender({blenderPath: executable!, scriptPath: inspect, blendPath: source})).exitCode).toBe(0);
    await writeFile(inspect, "raise RuntimeError('intentional fixture failure')\n");
    const failure = await runBlender({blenderPath: executable!, scriptPath: inspect});
    expect(failure.exitCode).not.toBe(0);
    expect(failure.timedOut).toBe(false);
  } finally { await rm(dir, {recursive: true, force: true}); }
}, 60_000);
