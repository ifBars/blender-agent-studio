import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sourceFingerprint } from "./pinned-mcp.ts";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const outputArg = argument("--output"), snapshotArg = argument("--skill-root"), guidanceArg = argument("--guidance-file");
if (!outputArg || !snapshotArg || !guidanceArg) throw new Error("Required: --output --skill-root (frozen snapshot) --guidance-file");
const output = resolve(outputArg), snapshot = resolve(snapshotArg), guidance = resolve(guidanceArg);
if (existsSync(output)) throw new Error("Campaign output already exists");
const timeout = Number(argument("--timeout-minutes") ?? 12);
if (!Number.isFinite(timeout) || timeout < 1 || timeout > 60) throw new Error("Timeout must be 1-60 minutes");
const tasks = (argument("--tasks") ?? "joinery_stool,task_lamp_clearance_holdout").split(",");
if (tasks.some(task => !["joinery_stool", "task_lamp_clearance_holdout"].includes(task))) throw new Error("Unknown spatial task");
const models = ["gpt-6-astra", "gpt-6.1-sol", "claude-opus-5-5", "claude-sonnet-5-5"];
const cells = tasks.flatMap(task => [0, 1].flatMap(round => models.map((model, index) => ({
  task, model, condition: (round + index) % 2 === 0 ? "current" : "guided",
  agent: model.startsWith("claude") ? "claude-code" : "codex",
}))));
await mkdir(output, { recursive: true });
const fingerprint = sourceFingerprint(snapshot);
const runner = join(snapshot, "skills/blender-agent-benchmark/scripts/run_benchmark.ts");
const manifest = { startedAt: new Date().toISOString(), models, tasks, cells, snapshot, fingerprint,
  timeoutMinutes: timeout, concurrency: 2, reasoning: "medium", repetitions: 1,
  scope: "Pilot: bundled guidance intervention, descriptive within-model comparisons. Concurrent timings are not latency benchmarks." };
await writeFile(join(output, "campaign.json"), JSON.stringify(manifest, null, 2));
const results: any[] = [];
for (let index = 0; index < cells.length; index += 2) {
  // Bound Blender contention to two independent cells; never edit either scene during evaluation.
  await Promise.all(cells.slice(index, index + 2).map(async cell => {
    const id = `${cell.task}--${cell.model}--${cell.condition}`;
    const directory = join(output, id);
    if (sourceFingerprint(snapshot) !== fingerprint) throw new Error("Pinned source changed during campaign");
    const command = ["bun", runner, "--agent", cell.agent, "--model", cell.model,
      "--reasoning", "medium", "--suite", "spatial", "--tasks", cell.task,
      "--mode", "skills", "--skill-root", snapshot, "--condition-label", cell.condition,
      "--timeout-minutes", String(timeout), "--bypass-approvals", "--output", directory,
      ...(cell.condition === "guided" ? ["--guidance-file", guidance] : [])];
    console.log(`START ${id}`);
    const proc = Bun.spawn(command, { cwd: output, stdout: Bun.file(join(output, `${id}.log`)), stderr: Bun.file(join(output, `${id}.stderr.log`)), windowsHide: true });
    await writeFile(join(output, `${id}.process.json`), JSON.stringify({ pid: proc.pid, command, startedAt: new Date().toISOString() }, null, 2));
    const exitCode = await proc.exited;
    const summaryPath = join(directory, "summary.json");
    const summary = existsSync(summaryPath) ? JSON.parse(await readFile(summaryPath, "utf8")) : null;
    results.push({ ...cell, exitCode, directory, summaryPath, hardGatePasses: summary?.hardGatePasses ?? null, automatedScore: summary?.meanAutomatedScore ?? null });
    await writeFile(join(output, "progress.json"), JSON.stringify(results, null, 2));
    console.log(`DONE ${id} exit=${exitCode} score=${summary?.meanAutomatedScore ?? "missing"}`);
  }));
}
await writeFile(join(output, "campaign-results.json"), JSON.stringify({ ...manifest, completedAt: new Date().toISOString(), results }, null, 2));
console.log(`Completed ${results.length} cells: ${output}`);
