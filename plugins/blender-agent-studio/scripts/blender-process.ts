import { accessSync, constants, existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type BlenderSource = "argument" | "BLENDER_EXECUTABLE" | "PATH" | "standard location";
export const TESTED_BLENDER_SERIES = "5.2";

export type BlenderRunResult = {
  command: string[];
  cwd: string;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  hint?: string;
};

// EEVEE and viewport-based tools abort without an OpenGL context; Cycles does not.
const OPENGL_FAILURE = /libEGL|EGL Error|libGL\b|OpenGL|GPU (?:backend|context)/i;
export const OPENGL_HINT = "Blender could not create an OpenGL context. EEVEE studio views need a GPU driver, or software OpenGL such as Mesa (libegl1, libgl1-mesa-dri) on a headless Linux machine. Cycles renders through blender_render_scene do not need OpenGL.";

export function resolveExistingPath(path: string, label: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new Error(`${label} does not exist: ${resolved}`);
  }
  return resolved;
}

export function resolveBlenderExecutable(path?: string): string {
  return locateBlender(path).executable;
}

/**
 * Explicit configuration wins and is never silently replaced. Only when nothing
 * is configured and `blender` is not on PATH are standard install locations used,
 * because the official macOS and Windows installers do not add Blender to PATH.
 */
export function locateBlender(path?: string, env: NodeJS.ProcessEnv = process.env): {executable: string; source: BlenderSource} {
  const configured = path ?? env.BLENDER_EXECUTABLE;
  if (configured) {
    return {executable: configuredExecutable(configured), source: path ? "argument" : "BLENDER_EXECUTABLE"};
  }
  const fromPath = Bun.which("blender", {PATH: env.PATH ?? ""});
  if (fromPath) return {executable: resolve(fromPath), source: "PATH"};
  const installed = standardBlenderCandidates(process.platform, env).find(isExecutableFile);
  if (installed) return {executable: installed, source: "standard location"};
  throw new Error(
    `Blender executable not found on PATH or in standard install locations. Install Blender ${TESTED_BLENDER_SERIES} LTS from https://www.blender.org/download/, or set BLENDER_EXECUTABLE to the executable${platformExample()}.`,
  );
}

function configuredExecutable(requested: string): string {
  const fromPath = Bun.which(requested);
  if (fromPath) return resolve(fromPath);
  const candidate = isAbsolute(requested) ? requested : resolve(requested);
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    if (!isExecutableFile(candidate)) {
      throw new Error(`Blender path is not executable: ${candidate}. Select an executable Blender installation.`);
    }
    return candidate;
  }
  throw new Error(
    `Blender executable not found: ${requested}. Use the executable itself, not its folder${platformExample()}. Set BLENDER_EXECUTABLE, add blender to PATH, or pass --blender (CLI) / blenderPath (MCP).`,
  );
}

function platformExample(platform = process.platform): string {
  if (platform === "darwin") return " (for example /Applications/Blender.app/Contents/MacOS/Blender)";
  if (platform === "win32") return " (for example C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe)";
  return " (for example ~/blender-5.2.2-linux-x64/blender)";
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    if (process.platform !== "win32") accessSync(path, constants.X_OK);
    return true;
  } catch { return false; }
}

/** Ordered, existing-or-not candidates for official installers, Steam, Snap, Flatpak and unpacked archives. */
export function standardBlenderCandidates(platform: NodeJS.Platform, env: NodeJS.ProcessEnv = process.env,
  home = env.HOME ?? env.USERPROFILE ?? homedir()): string[] {
  const within = (dir: string | undefined, pattern: RegExp, executable: string) =>
    dir ? listDir(dir).filter(name => pattern.test(name)).map(name => join(dir, name, executable)) : [];
  let candidates: string[];
  if (platform === "darwin") {
    candidates = [
      ...within("/Applications", /^blender.*\.app$/i, "Contents/MacOS/Blender"),
      ...within(join(home, "Applications"), /^blender.*\.app$/i, "Contents/MacOS/Blender"),
      join(home, "Library/Application Support/Steam/steamapps/common/Blender/Blender.app/Contents/MacOS/Blender"),
    ];
  } else if (platform === "win32") {
    const programFiles = [env.ProgramFiles, env.ProgramW6432, env["ProgramFiles(x86)"]];
    candidates = [
      ...programFiles.flatMap(dir => within(dir && join(dir, "Blender Foundation"), /^blender/i, "blender.exe")),
      ...programFiles.map(dir => dir && join(dir, "Steam/steamapps/common/Blender/blender.exe")),
    ].filter((path): path is string => Boolean(path));
  } else {
    candidates = [
      "/snap/bin/blender",
      "/var/lib/flatpak/exports/bin/org.blender.Blender",
      join(home, ".local/share/flatpak/exports/bin/org.blender.Blender"),
      ...within("/opt", /^blender/i, "blender"),
      ...within(home, /^blender-\d/i, "blender"),
      ...within(join(home, "Applications"), /^blender-\d/i, "blender"),
      join(home, ".steam/steam/steamapps/common/Blender/blender"),
      join(home, ".local/share/Steam/steamapps/common/Blender/blender"),
    ];
  }
  // Prefer the tested series, then unversioned installs (usually the current
  // app), then newer versions. The sort is stable within each group.
  return [...new Set(candidates)].sort((a, b) => rank(a) - rank(b) || compareVersions(versionIn(b), versionIn(a)));
}

function listDir(dir: string): string[] {
  try { return readdirSync(dir).sort(); } catch { return []; }
}

function versionIn(path: string): number[] | undefined {
  const match = /blender[ -]?(\d+)\.(\d+)(?:\.(\d+))?/i.exec(path);
  return match ? match.slice(1).map(part => Number(part ?? 0)) : undefined;
}

function rank(path: string): number {
  const version = versionIn(path);
  if (version?.slice(0, 2).join(".") === TESTED_BLENDER_SERIES) return 0;
  return version ? 2 : 1;
}

function compareVersions(a?: number[], b?: number[]): number {
  for (let i = 0; i < 3; i++) {
    const difference = (a?.[i] ?? 0) - (b?.[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
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
    ...(exitCode !== 0 && OPENGL_FAILURE.test(stdout + stderr) ? {hint: OPENGL_HINT} : {}),
  };
}

export async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
}
