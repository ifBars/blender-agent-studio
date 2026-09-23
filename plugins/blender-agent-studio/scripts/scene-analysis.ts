import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runBlender } from "./blender-process.ts";

const pluginRoot = resolve(import.meta.dir, "..");

export function runtimeExecutable(): string {
  const executable = process.env.BAS_RUNTIME_EXECUTABLE ?? join(pluginRoot, "runtime", "target", "release", process.platform === "win32" ? "bas-runtime.exe" : "bas-runtime");
  if (!existsSync(executable)) throw new Error(`Scene analysis runtime is not built. Run bun run setup:runtime in ${pluginRoot}, or set BAS_RUNTIME_EXECUTABLE to a built bas-runtime binary. Existing inspection/render tools do not require Rust.`);
  return executable;
}

async function runRuntime(request: unknown, maxBytes: number, timeoutMs: number) {
  const input = JSON.stringify(request);
  if (Buffer.byteLength(input) > maxBytes) throw new Error(`SceneIR runtime request exceeds ${maxBytes / 1024 / 1024} MiB`);
  const proc = Bun.spawn([runtimeExecutable()], { stdin: new Blob([input]), stdout: "pipe", stderr: "pipe", windowsHide: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill(); }, timeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    if (timedOut) throw new Error("Scene analysis timed out");
    if (exitCode !== 0) throw new Error(`Scene analysis failed: ${stderr.trim()}`);
    return JSON.parse(stdout) as Record<string, any>;
  } finally { clearTimeout(timer); }
}

export async function analyzeSceneIR(scene: unknown, options: Record<string, unknown>, timeoutMs = 30_000) {
  return runRuntime({ scene, options }, 16 * 1024 * 1024, timeoutMs);
}

export async function compareSceneIR(baseline: unknown, candidate: unknown, options: Record<string, unknown>, timeoutMs = 30_000) {
  return runRuntime({ baseline, candidate, options }, 32 * 1024 * 1024, timeoutMs);
}

async function extractSceneIR(assetPath: string, blenderPath: string | undefined, timeoutMs: number, frame?: number) {
  if (frame !== undefined && (!Number.isInteger(frame) || Math.abs(frame) > 1_048_574)) throw new Error("frame must be an integer between -1048574 and 1048574");
  const temporary = await mkdtemp(join(tmpdir(), "bas-scene-ir-"));
  try {
    const sceneFile = join(temporary, "scene.json");
    const process = await runBlender({ blenderPath,
      scriptPath: join(pluginRoot, "skills/blender-asset-validation/scripts/extract_scene_ir.py"),
      scriptArgs: ["--input", resolve(assetPath), "--output", sceneFile, ...(frame === undefined ? [] : ["--frame", String(frame)])], timeoutMs });
    if (process.timedOut || process.exitCode !== 0) throw new Error(`Scene extraction failed${process.timedOut ? " (timeout)" : ""}: ${process.stderr || process.stdout}`);
    if ((await stat(sceneFile)).size > 15 * 1024 * 1024) throw new Error("SceneIR exceeds 15 MiB");
    return JSON.parse(await readFile(sceneFile, "utf8"));
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function describeAsset(args: {
  assetPath: string; outputJson?: string; blenderPath?: string; timeoutMs: number;
  frame?: number;
  options: Record<string, unknown>;
}) {
  runtimeExecutable(); // Fail before starting Blender if setup is missing.
  const output = args.outputJson ? resolve(args.outputJson) : undefined;
  if (output && existsSync(output)) throw new Error("outputJson must be a new file");
  const scene = await extractSceneIR(args.assetPath, args.blenderPath, args.timeoutMs, args.frame);
  const analysis = await analyzeSceneIR(scene, args.options);
  if (output) await writeFile(output, JSON.stringify({ scene, analysis }, null, 2), { flag: "wx" });
  return { ...analysis, outputJson: output ?? null };
}

export async function compareAssets(args: {
  baselineAssetPath: string; candidateAssetPath: string; outputJson?: string;
  blenderPath?: string; timeoutMs: number; options: Record<string, unknown>;
  frame?: number;
}) {
  runtimeExecutable();
  const output = args.outputJson ? resolve(args.outputJson) : undefined;
  if (output && existsSync(output)) throw new Error("outputJson must be a new file");
  const baseline = await extractSceneIR(args.baselineAssetPath, args.blenderPath, args.timeoutMs, args.frame);
  const candidate = await extractSceneIR(args.candidateAssetPath, args.blenderPath, args.timeoutMs, args.frame);
  if (baseline.frame !== candidate.frame) throw new Error("Scene frames differ; supply frame to compare the same animation state");
  if (baseline.meters_per_unit !== candidate.meters_per_unit) throw new Error("Scene unit scales differ; normalize units before comparing world-space constraints");
  const diff = await compareSceneIR(baseline, candidate, args.options, args.timeoutMs);
  if (output) await writeFile(output, JSON.stringify({ baseline, candidate, diff }, null, 2), { flag: "wx" });
  return { ...diff, outputJson: output ?? null };
}
