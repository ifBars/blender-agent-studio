import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { runBlender } from "./blender-process.ts";

type Checkpoint = { label: string; kind: string; file: string; sha256: string; scene: string; frame: number };
const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

export async function readCapture(manifestPath: string): Promise<{path: string; checkpoints: Checkpoint[]}> {
  const path = await realpath(resolve(manifestPath));
  const capture = JSON.parse(await readFile(path, "utf8"));
  const entries = capture.checkpoints;
  if (capture.schemaVersion !== 1 || capture.status !== "complete" || capture.capture !== "authored_build_checkpoints" ||
      !Array.isArray(entries) || entries.length < 3 || entries.length > 64)
    throw new Error("A complete capture with 3..64 actual checkpoints is required");
  const seen = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    if (typeof entry.file !== "string" || !/^\d{3}\.blend$/.test(entry.file) || seen.has(entry.file) ||
        typeof entry.label !== "string" || !entry.label.trim() || entry.label.length > 160 ||
        typeof entry.scene !== "string" || !entry.scene || !Number.isInteger(entry.frame) ||
        Math.abs(entry.frame) > 1048574 || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256))
      throw new Error(`Invalid checkpoint ${index}`);
    const expectedKind = index === 0 ? "initial" : index === entries.length - 1 ? "final" : "checkpoint";
    if (entry.kind !== expectedKind) throw new Error(`Invalid checkpoint order at ${index}`);
    const file = await realpath(join(dirname(path), entry.file));
    const rel = relative(dirname(path), file);
    if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))
      throw new Error("Checkpoint leaves the capture directory");
    if (hash(await readFile(file)) !== entry.sha256) throw new Error(`Checkpoint changed: ${entry.file}`);
    seen.add(entry.file);
  }
  return {path, checkpoints: entries};
}

export function encoderArgs(frameCount: number, secondsPerStep: number, fps: number): string[] {
  if (!Number.isInteger(frameCount) || frameCount < 3 || frameCount > 64 ||
      !Number.isFinite(secondsPerStep) || secondsPerStep < 0.25 || secondsPerStep > 5 ||
      ![24, 30, 60].includes(fps)) throw new Error("Invalid timelapse encoding bounds");
  return ["-nostdin", "-n", "-v", "error", "-f", "concat", "-safe", "1", "-i", "frames.txt",
    "-an", "-vf", `fps=${fps},pad=ceil(iw/2)*2:ceil(ih/2)*2`,
    "-frames:v", String(Math.round(frameCount * secondsPerStep * fps)),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "modeling-timelapse.mp4"];
}

export async function renderModelingTimelapse(options: {
  manifestPath: string; outputDir: string; blenderPath?: string;
  maxEdge?: number; samples?: number; secondsPerStep?: number; fps?: number; timeoutMs?: number;
}) {
  const maxEdge = options.maxEdge ?? 720, samples = options.samples ?? 16;
  const secondsPerStep = options.secondsPerStep ?? 1, fps = options.fps ?? 24;
  const timeoutMs = options.timeoutMs ?? 600000;
  if (!Number.isInteger(maxEdge) || maxEdge < 128 || maxEdge > 1920 ||
      !Number.isInteger(samples) || samples < 1 || samples > 128 ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 1800000)
    throw new Error("Invalid timelapse rendering bounds");
  const capture = await readCapture(options.manifestPath);
  const args = encoderArgs(capture.checkpoints.length, secondsPerStep, fps);
  const ffmpeg = Bun.which(process.env.FFMPEG_EXECUTABLE ?? "ffmpeg");
  if (!ffmpeg) throw new Error("FFmpeg executable not found; set FFMPEG_EXECUTABLE or add ffmpeg to PATH");
  const output = resolve(options.outputDir);
  await mkdir(dirname(output), {recursive: true});
  await mkdir(output); // Never return old frames or overwrite an existing video.
  const start = performance.now();
  try {
    const renderProcess = await runBlender({blenderPath: options.blenderPath,
      scriptPath: resolve(import.meta.dir, "../skills/blender-rendering-workflow/scripts/render_timelapse.py"),
      scriptArgs: ["--manifest", capture.path, "--output-dir", join(output, "frames"),
        "--max-edge", String(maxEdge), "--samples", String(samples)], timeoutMs});
    await writeFile(join(output, "render-process.json"), JSON.stringify(renderProcess, null, 2));
    if (renderProcess.exitCode !== 0 || renderProcess.timedOut) throw new Error("Timelapse rendering failed; see render-process.json");
    const rendered = JSON.parse(await readFile(join(output, "frames/render-manifest.json"), "utf8"));
    const playlist = capture.checkpoints.map((_, i) => `file 'frames/${String(i).padStart(3, "0")}.png'\nduration ${secondsPerStep}\n`).join("") +
      `file 'frames/${String(capture.checkpoints.length - 1).padStart(3, "0")}.png'\n`;
    await writeFile(join(output, "frames.txt"), playlist);
    const remaining = timeoutMs - (performance.now() - start);
    if (remaining <= 0) throw new Error("Timelapse exceeded its total time budget");
    const proc = Bun.spawn([ffmpeg, ...args], {cwd: output, stdout: "ignore", stderr: "pipe", windowsHide: true});
    let timedOut = false;
    const timer = setTimeout(() => {timedOut = true; proc.kill();}, remaining);
    const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    clearTimeout(timer);
    await writeFile(join(output, "encode-process.json"), JSON.stringify({exitCode, timedOut, stderr}, null, 2));
    if (exitCode !== 0 || timedOut) throw new Error(`Timelapse encoding failed: ${stderr}`);
    const report = {...rendered, status: "complete", manifestPath: capture.path,
      videoPath: join(output, "modeling-timelapse.mp4"), fps, secondsPerStep,
      durationSeconds: Math.round(capture.checkpoints.length * secondsPerStep * fps) / fps,
      sourceModified: false, videoSha256: hash(await readFile(join(output, "modeling-timelapse.mp4")))};
    await writeFile(join(output, "timelapse.json"), JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    await writeFile(join(output, "timelapse.json"), JSON.stringify({status: "failed", error: String(error)}, null, 2));
    throw error;
  }
}

if (import.meta.main) {
  const arg = (key: string) => {const i = process.argv.indexOf(key); return i < 0 ? undefined : process.argv[i + 1];};
  if (!arg("--manifest") || !arg("--output-dir")) throw new Error("Usage: bun modeling-timelapse.ts --manifest progress/capture.json --output-dir NEW_DIRECTORY");
  const number = (key: string) => arg(key) === undefined ? undefined : Number(arg(key));
  console.log(JSON.stringify(await renderModelingTimelapse({manifestPath: arg("--manifest")!, outputDir: arg("--output-dir")!,
    blenderPath: arg("--blender"), maxEdge: number("--max-edge"), samples: number("--samples"),
    secondsPerStep: number("--seconds-per-step"), fps: number("--fps"), timeoutMs: number("--timeout-ms")}), null, 2));
}
