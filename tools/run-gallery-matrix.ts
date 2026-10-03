import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sourceFingerprint } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/pinned-mcp";
import { GALLERY_MODELS } from "./gallery-matrix";

const arg = (name: string) => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`); return resolve(process.argv[i + 1]); };
const output = arg("--output"), snapshot = arg("--skill-root"), existing = JSON.parse(await Bun.file(arg("--existing-data")).text());
const models = GALLERY_MODELS;
const tasks = ["signal_lantern", "tabletop_press", "winch_drawbridge"];
const pairs = tasks.flatMap(task => models.filter(model => !existing.pairs.some((p: any) => p.task === task && p.model === model)).map(model => ({ task, model })));
const cells = pairs.flatMap((pair, index) => (index % 2 ? ["plugin", "vanilla"] : ["vanilla", "plugin"]).map(condition => ({ ...pair, condition })));
if (existsSync(output)) throw new Error("Choose a fresh campaign directory; never overwrite a generation");
await mkdir(output, { recursive: true });
const fingerprint = sourceFingerprint(snapshot);
const manifest = { experiment: "vanilla_vs_plugin", startedAt: new Date().toISOString(), snapshot, fingerprint, models, tasks, pairs, cells, reasoning: "medium", timeoutMinutes: 12, concurrency: 2, repetitions: 1 };
await writeFile(join(output, "campaign.json"), JSON.stringify(manifest, null, 2));
const results: any[] = [];
for (let index = 0; index < cells.length; index += 2) {
  await Promise.all(cells.slice(index, index + 2).map(async cell => {
    if (sourceFingerprint(snapshot) !== fingerprint) throw new Error("Pinned plugin changed");
    const id = `${cell.task}--${cell.model}--${cell.condition}`, directory = join(output, id);
    const command = ["bun", join(snapshot, "skills/blender-agent-benchmark/scripts/run_benchmark.ts"),
      "--suite", "full", "--tasks", cell.task, "--model", cell.model, "--agent", cell.model.startsWith("claude") ? "claude-code" : "codex",
      "--mode", cell.condition === "vanilla" ? "baseline" : "skills", "--condition-label", cell.condition,
      "--reasoning", "medium", "--timeout-minutes", "12", "--bypass-approvals", "--output", directory,
      ...(cell.condition === "plugin" ? ["--skill-root", snapshot] : [])];
    console.log(`START ${id}`);
    const child = Bun.spawn(command, { cwd: output, stdout: Bun.file(join(output, `${id}.log`)), stderr: Bun.file(join(output, `${id}.stderr.log`)), windowsHide: true });
    const record = { command, pid: child.pid, startedAt: new Date().toISOString() };
    await writeFile(join(output, `${id}.process.json`), JSON.stringify(record, null, 2));
    let timedOut = false;
    const watchdog = setTimeout(() => { timedOut = true; Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore", windowsHide: true }); }, 30 * 60_000);
    const exitCode = await child.exited; clearTimeout(watchdog);
    const summaryPath = join(directory, "summary.json");
    const summary = existsSync(summaryPath) ? JSON.parse(await readFile(summaryPath, "utf8")) : null;
    results.push({ ...cell, exitCode, timedOut, summaryPath, score: summary?.meanAutomatedScore ?? null, hardGatePasses: summary?.hardGatePasses ?? null });
    await writeFile(join(output, `${id}.process.json`), JSON.stringify({ ...record, exitCode, timedOut, completedAt: new Date().toISOString() }, null, 2));
    await writeFile(join(output, "progress.json"), JSON.stringify(results, null, 2));
    console.log(`DONE ${id} exit=${exitCode} score=${summary?.meanAutomatedScore ?? "missing"}`);
  }));
}
await writeFile(join(output, "campaign-results.json"), JSON.stringify({ ...manifest, completedAt: new Date().toISOString(), results }, null, 2));
console.log(`Completed ${results.length} cells`);
