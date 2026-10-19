import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { locateBlender, OPENGL_HINT, runBlender, standardBlenderCandidates } from "./blender-process.ts";

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

async function fakeExecutable(path: string) {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, "#!/bin/sh\nexit 0\n");
  await chmod(path, 0o755);
}

test("standard install candidates prefer the tested series, then unversioned, then newest", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-discovery-"));
  try {
    for (const name of ["Blender 4.2", "Blender 5.3", "Blender 5.2", "Notes"]) {
      await mkdir(join(root, "Blender Foundation", name), {recursive: true});
    }
    const windows = standardBlenderCandidates("win32", {ProgramFiles: root}, root);
    expect(windows.filter(path => path.includes("Blender Foundation"))).toEqual(["Blender 5.2", "Blender 5.3", "Blender 4.2"]
      .map(name => join(root, "Blender Foundation", name, "blender.exe")));
    expect(windows.some(path => path.includes("Notes"))).toBe(false);
    for (const name of ["Blender 4.5.app", "Blender.app"]) await mkdir(join(root, "Applications", name), {recursive: true});
    const mac = standardBlenderCandidates("darwin", {}, root).filter(path => path.startsWith(join(root, "Applications")));
    expect(mac).toEqual(["Blender.app", "Blender 4.5.app"]
      .map(name => join(root, "Applications", name, "Contents/MacOS/Blender")));
  } finally { await rm(root, {recursive: true, force: true}); }
});

test.skipIf(process.platform === "win32")("configured paths win, PATH is next, and standard locations are a fallback", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-discovery-"));
  try {
    const empty = join(root, "empty-bin");
    await mkdir(empty);
    // 5.2.99 outranks any real 5.2 install that the test machine may have in /opt.
    const unpacked = join(root, "blender-5.2.99-linux-x64", "blender");
    await fakeExecutable(unpacked);
    if (process.platform === "linux") {
      expect(locateBlender(undefined, {PATH: empty, HOME: root})).toEqual({executable: unpacked, source: "standard location"});
    }
    const onPath = join(root, "bin", "blender");
    await fakeExecutable(onPath);
    expect(locateBlender(undefined, {PATH: dirname(onPath), HOME: root})).toEqual({executable: onPath, source: "PATH"});
    expect(locateBlender(undefined, {PATH: empty, HOME: root, BLENDER_EXECUTABLE: onPath})).toEqual({executable: onPath, source: "BLENDER_EXECUTABLE"});
    expect(locateBlender(unpacked, {PATH: dirname(onPath), HOME: root})).toEqual({executable: unpacked, source: "argument"});
    // A wrong configured path is reported, never silently replaced by a discovered one.
    expect(() => locateBlender(undefined, {PATH: dirname(onPath), HOME: root, BLENDER_EXECUTABLE: join(root, "missing")}))
      .toThrow("Use the executable itself");
    const nowhere = join(root, "nowhere");
    if (!standardBlenderCandidates(process.platform, {}, nowhere).some(existsSync)) {
      expect(() => locateBlender(undefined, {PATH: empty, HOME: nowhere})).toThrow("standard install locations");
    }
  } finally { await rm(root, {recursive: true, force: true}); }
});

test.skipIf(process.platform === "win32")("OpenGL startup failures carry an actionable hint; EGL noise on success does not", async () => {
  const root = await mkdtemp(join(tmpdir(), "bas-opengl-"));
  try {
    const fake = join(root, "blender");
    const script = join(root, "noop.py");
    await writeFile(script, "");
    await writeFile(fake, "#!/bin/sh\necho \"Couldn't open libEGL.so.1: cannot open shared object file\" >&2\nexit 134\n");
    await chmod(fake, 0o755);
    expect((await runBlender({blenderPath: fake, scriptPath: script})).hint).toBe(OPENGL_HINT);
    await writeFile(fake, "#!/bin/sh\necho 'EGL Error (0x3009): EGL_BAD_MATCH' >&2\nexit 0\n");
    expect((await runBlender({blenderPath: fake, scriptPath: script})).hint).toBeUndefined();
  } finally { await rm(root, {recursive: true, force: true}); }
});
