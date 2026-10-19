import { accessSync, constants, existsSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

export const DEFAULT_BLENDER_PATH =
  process.env.BLENDER_EXECUTABLE ??
  Bun.which("blender") ??
  "blender";

export type BlenderRunResult = {
  command: string[];
  cwd: string;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export function resolveExistingPath(path: string, label: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`${label} does not exist: ${resolved}`);
  }
  return resolved;
}

export function resolveBlenderExecutable(path?: string): string {
  const requested = path ?? process.env.BLENDER_EXECUTABLE ?? "blender";
  const fromPath = Bun.which(requested);
  if (fromPath) {
    return resolve(fromPath);
  }
  const candidate = isAbsolute(requested) ? requested : resolve(requested);
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    if (process.platform !== "win32") {
      try { accessSync(candidate, constants.X_OK); }
      catch { throw new Error(`Blender path is not executable: ${candidate}. Select an executable Blender installation.`); }
    }
    return candidate;
  }
  throw new Error(
    `Blender executable not found: ${requested}. Set BLENDER_EXECUTABLE, add blender to PATH, or pass --blender (CLI) / blenderPath (MCP).`,
  );
}

export async function runBlender(options: {
  blenderPath?: string;
  scriptPath: string;
  blendPath?: string;
  scriptArgs?: string[];
  cwd?: string;
  timeoutMs?: number;
}): Promise<BlenderRunResult> {
  const blenderPath = resolveBlenderExecutable(options.blenderPath);
  const scriptPath = resolveExistingPath(options.scriptPath, "Python script");
  const cwd = resolve(options.cwd ?? dirname(scriptPath));
  const args: string[] = ["--background", "--factory-startup", "--disable-autoexec"];
  // Process-local benchmark resource policy; ordinary callers keep their settings.
  if (process.env.BAS_RESOURCE_JOB === "windows-cpu-hard-cap-v1") args.push("--threads", "2");

  if (options.blendPath) {
    args.push(resolveExistingPath(options.blendPath, "Blend file"));
  }
  args.push("--python-exit-code", "1", "--python", scriptPath);
  if (options.scriptArgs?.length) {
    args.push("--", ...options.scriptArgs);
  }

  return runBlenderCommand(blenderPath, args, cwd, options.timeoutMs ?? 300_000);
}

export async function runBlenderVersion(options: {blenderPath?: string; timeoutMs?: number} = {}): Promise<BlenderRunResult> {
  return runBlenderCommand(resolveBlenderExecutable(options.blenderPath), ["--version"], process.cwd(), options.timeoutMs ?? 10_000);
}

async function runBlenderCommand(blenderPath: string, args: string[], cwd: string, timeoutMs: number): Promise<BlenderRunResult> {
  const started = performance.now();
  const proc = Bun.spawn([blenderPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    windowsHide: true,
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);

  return {
    command: [blenderPath, ...args],
    cwd,
    exitCode,
    durationMs: Math.round(performance.now() - started),
    stdout,
    stderr,
    timedOut,
  };
}

export async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
}
