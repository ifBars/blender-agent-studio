import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSetup, supportedBun } from "./doctor.ts";
import { resolveBlenderExecutable } from "./blender-process.ts";

test("Bun minimum version is compared numerically", () => {
  for (const version of ["1.3.5", "1.3.10", "1.4.0", "2.0.0"]) expect(supportedBun(version)).toBe(true);
  for (const version of ["1.3.4", "1.2.99", "0.99.0", "invalid"]) expect(supportedBun(version)).toBe(false);
});

test("missing Blender fails with actionable guidance and a persistent report", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-doctor-test-"));
  try {
    const report = await checkSetup({blenderPath: join(root, "missing blender"), outputDir: join(root, "output")});
    expect(report.status).toBe("fail");
    expect(report.checks.find(c => c.status === "fail")?.message).toContain("BLENDER_EXECUTABLE");
    expect(JSON.parse(await readFile(join(report.outputDir, "doctor-report.json"), "utf8"))).toEqual(report);
    expect(report.checks.find(c => c.name === "host-integration")?.status).toBe("skip");
    expect(() => resolveBlenderExecutable(root)).toThrow("Blender executable not found");
  } finally { await rm(root, {recursive: true, force: true}); }
});

test("rejects old output without touching it and rejects unbounded timeouts", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-doctor-test-"));
  try {
    const marker = join(root, "keep.txt");
    await writeFile(marker, "keep");
    await expect(checkSetup({outputDir: root})).rejects.toThrow();
    expect(await readFile(marker, "utf8")).toBe("keep");
    for (const timeoutMs of [0, -1, 300001, NaN, 1000.5]) {
      await expect(checkSetup({timeoutMs})).rejects.toThrow("--timeout-ms");
    }
  } finally { await rm(root, {recursive: true, force: true}); }
});

// Test failed/lying/hanging executables without requiring Blender or a GPU in CI.
test.skipIf(process.platform === "win32")("nonzero exits, false success and hung startup cannot pass", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-doctor-test-"));
  try {
    const fake = join(root, "fake blender");
    await writeFile(fake, "#!/bin/sh\nexit 0\n");
    await chmod(fake, 0o644);
    const denied = await checkSetup({blenderPath: fake, outputDir: join(root, "not-executable")});
    expect(denied.status).toBe("fail");
    expect(denied.checks.find(c => c.status === "fail")?.message).toContain("not executable");
    for (const [name, body] of [["error", "exit 7"], ["empty", "exit 0"], ["timeout", "exec sleep 30"]]) {
      await writeFile(fake, `#!/bin/sh\n${body}\n`);
      await chmod(fake, 0o755);
      const report = await checkSetup({blenderPath: fake, outputDir: join(root, name), timeoutMs: 1000});
      expect(report.status).toBe("fail");
      if (name === "timeout") expect(report.checks.find(c => c.status === "fail")?.message).toContain("exceeded");
    }
  } finally { await rm(root, {recursive: true, force: true}); }
}, 10000);

const blender = process.env.BLENDER_EXECUTABLE || Bun.which("blender");
test.skipIf(!blender)("real Blender saves, reopens and CPU-renders without requiring MCP or Rust", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-doctor-live-"));
  try {
    const report = await checkSetup({blenderPath: blender!, outputDir: join(root, "output with spaces")});
    expect(report.status).toBe("pass");
    for (const name of ["python", "save", "reopen", "cpu-render"]) {
      expect(report.checks.find(c => c.name === name)?.status).toBe("pass");
    }
    // EEVEE needs OpenGL, which headless machines may lack; that is a warning, not a failure.
    expect(["pass", "warn"]).toContain(report.checks.find(c => c.name === "eevee-render")?.status);
    const png = await readFile(join(report.outputDir, "preview.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(128);
    expect(png.readUInt32BE(20)).toBe(128);
    const skipped = await checkSetup({blenderPath: blender!, outputDir: join(root, "skip"), skipRender: true});
    expect(skipped.status).toBe("pass");
    expect(skipped.checks.find(c => c.name === "cpu-render")?.status).toBe("skip");
    expect(skipped.checks.some(c => c.name === "eevee-render")).toBe(false);
    expect(await Bun.file(join(skipped.outputDir, "preview.png")).exists()).toBe(false);
  } finally { await rm(root, {recursive: true, force: true}); }
}, 120000);
