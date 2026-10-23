import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { runBlender } from "./blender-process.ts";

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
for (const region of ["hand", "upper_body"]) {
  test.skipIf(!blender)(`connected ${region} cage passes Blender geometry and topology regressions`, async () => {
    const result = await runBlender({
      blenderPath: blender!,
      scriptPath: resolve(import.meta.dir, `../skills/blender-character-workflow/scripts/test_build_${region}.py`),
      timeoutMs: 30_000,
    });
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toContain("OK");
  }, 40_000);
}
