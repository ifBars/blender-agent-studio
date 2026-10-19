import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { locateBlender, runBlender, TESTED_BLENDER_SERIES } from "./blender-process.ts";

type Check = { name: string; status: "pass" | "warn" | "fail" | "skip"; message: string };
export type SetupReport = { status: "pass" | "fail"; outputDir: string; executable?: string; checks: Check[] };

export function supportedBun(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 1 || (major === 1 && (minor > 3 || (minor === 3 && patch >= 5)));
}

/** Only creates a fixed fixture. Never opens or overwrites a user's scene. */
export async function checkSetup(options: {
  blenderPath?: string; outputDir?: string; timeoutMs?: number; skipRender?: boolean; viaMcp?: boolean;
} = {}): Promise<SetupReport> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300_000) {
    throw new Error("--timeout-ms must be an integer from 1000 to 300000");
  }
  // Exclusive directory creation rejects stale output and existing user data.
  const outputDir = options.outputDir ? resolve(options.outputDir) : await mkdtemp(join(tmpdir(), "bas-doctor-"));
  if (options.outputDir) await mkdir(outputDir);
  const report: SetupReport = { status: "pass", outputDir, checks: [] };
  const check = (name: string, status: Check["status"], message: string) => {
    report.checks.push({name, status, message});
    if (status === "fail") report.status = "fail";
  };
  check("bun", supportedBun(Bun.version) ? "pass" : "fail", `Bun ${Bun.version}; requires 1.3.5 or newer`);
  try {
    const located = locateBlender(options.blenderPath);
    report.executable = located.executable;
    check("executable", "pass", `${located.executable} (from ${located.source})`);
    const process = await runBlender({blenderPath: report.executable,
      scriptPath: join(import.meta.dir, "setup-probe.py"),
      scriptArgs: [outputDir, ...(options.skipRender ? ["--skip-render"] : [])], timeoutMs});
    await writeFile(join(outputDir, "blender-process.json"), JSON.stringify(process, null, 2) + "\n");
    let probe: {blenderVersion: string; checks: string[]} | undefined;
    try { probe = JSON.parse(await readFile(join(outputDir, "probe.json"), "utf8")); } catch { /* Startup can fail before Python runs. */ }
    if (probe) {
      check("blender-version", probe.blenderVersion.startsWith(`${TESTED_BLENDER_SERIES}.`) ? "pass" : "warn",
        `Blender ${probe.blenderVersion}; ${TESTED_BLENDER_SERIES} LTS is the tested version. Other versions may differ.`);
      for (const name of probe.checks) check(name, "pass", "Completed in the local Blender process");
    }
    const required = ["python", "save", "reopen", ...(options.skipRender ? [] : ["cpu-render"])];
    if (process.timedOut || process.exitCode !== 0 || required.some(name => !probe?.checks.includes(name))) {
      check("probe", "fail", process.timedOut
        ? `Blender exceeded ${timeoutMs} ms. See blender-process.json; try --timeout-ms 180000 on a slow CPU.`
        : `Blender did not complete the check (exit ${process.exitCode}). See blender-process.json. If cpu-render is missing, check your Blender Cycles installation; --skip-render isolates startup/save/reopen.`);
    }
    if (options.skipRender) check("cpu-render", "skip", "Not requested; rendering has NOT been verified");
    else if (report.status === "pass") await checkEevee(located.executable, outputDir, timeoutMs, check);
  } catch (error) {
    check("probe", "fail", `${error instanceof Error ? error.message : error} Restart your agent session after changing PATH or BLENDER_EXECUTABLE.`);
  }
  if (options.viaMcp) {
    check("host-integration", "pass", "Reached through the plugin's MCP server. GPU rendering, network assets and the optional Rust runtime are not checked.");
  } else {
    check("host-integration", "skip", "This local check does not verify Codex/Claude plugin loading, MCP transport, GPU, network assets, or the optional Rust runtime. In a new agent session, ask the agent to run blender_check_setup.");
  }
  await writeFile(join(outputDir, "doctor-report.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

// Studio evidence views use EEVEE, which needs OpenGL; Cycles does not. Report
// the difference instead of letting the first evidence render abort unexplained.
async function checkEevee(blenderPath: string, outputDir: string, timeoutMs: number,
  check: (name: string, status: Check["status"], message: string) => void) {
  const process = await runBlender({blenderPath, scriptPath: join(import.meta.dir, "setup-probe.py"),
    scriptArgs: [outputDir, "--eevee"], timeoutMs});
  await writeFile(join(outputDir, "eevee-process.json"), JSON.stringify(process, null, 2) + "\n");
  if (process.exitCode === 0 && !process.timedOut && await Bun.file(join(outputDir, "eevee-preview.png")).exists()) {
    check("eevee-render", "pass", "Studio evidence views (EEVEE) can render");
  } else {
    check("eevee-render", "warn", `EEVEE could not render (${process.timedOut ? "timed out" : `exit ${process.exitCode}`}). Cycles renders work, but blender_render_evidence studio views need OpenGL: a GPU driver, or software OpenGL such as Mesa on a headless Linux machine. See eevee-process.json.`);
  }
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({args: process.argv.slice(2), options: {
      blender: {type: "string"}, "output-dir": {type: "string"}, "timeout-ms": {type: "string"},
      "skip-render": {type: "boolean"}, json: {type: "boolean"}, help: {type: "boolean"},
    }});
    if (values.help) {
      console.log("Usage: bun run doctor [--blender PATH] [--output-dir NEW_DIRECTORY] [--timeout-ms 90000] [--skip-render] [--json]\nCreates a tiny local .blend, reopens it and renders 128px on CPU. No downloads, user files, GPU or Rust required. Output is retained for inspection.");
    } else {
      const report = await checkSetup({blenderPath: values.blender, outputDir: values["output-dir"],
        timeoutMs: values["timeout-ms"] === undefined ? undefined : Number(values["timeout-ms"]), skipRender: values["skip-render"]});
      console.log(values.json ? JSON.stringify(report, null, 2) : [
        `Blender Agent Studio setup: ${report.status.toUpperCase()}${report.status === "pass" && report.checks.some(c => c.status === "warn") ? " (with warnings)" : ""}`,
        ...report.checks.map(c => `[${c.status.toUpperCase()}] ${c.name}: ${c.message}`),
        `Evidence: ${report.outputDir}`,
      ].join("\n"));
      process.exitCode = report.status === "pass" ? 0 : 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
