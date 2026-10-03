import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sourceFingerprint } from "./pinned-mcp.ts";
import { provenanceMismatches } from "./provenance.ts";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const outputArg = argument("--output"), snapshotArg = argument("--snapshot"), pluginArg = argument("--plugin-runs");
if (!outputArg || !snapshotArg || !pluginArg) throw new Error("--output, --snapshot and --plugin-runs are required");
const output = resolve(outputArg), snapshot = resolve(snapshotArg), pluginRuns = resolve(pluginArg);
if (existsSync(output)) throw new Error("Use a fresh output directory");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const models = ["gpt-6-astra", "gpt-6.1-sol", "claude-opus-5-5", "claude-sonnet-5-5"];
const tasks = ["joinery_stool", "task_lamp_clearance_holdout"];
const cells = tasks.flatMap(task => models.map(model => ({ task, model, condition: "vanilla", agent: model.startsWith("claude") ? "claude-code" : "codex" })));
for (const cell of cells) {
  const plugin = await read(join(pluginRuns, `${cell.task}--${cell.model}--current`, "summary.json"));
  if (plugin.executionMode !== "skills" || plugin.guidanceHash || plugin.model !== cell.model || plugin.timeoutMinutes !== 12 || plugin.reasoning !== "medium")
    throw new Error(`Unsuitable existing plugin run: ${cell.task}/${cell.model}`);
}
await mkdir(output, { recursive: true });
const fingerprint = sourceFingerprint(snapshot);
const manifest = { startedAt: new Date().toISOString(), experiment: "vanilla_vs_plugin", snapshot, fingerprint, pluginRuns, cells,
  scope: "New isolated vanilla generations paired with existing unmodified plugin-skill generations. Vanilla collected later; generation order is not counterbalanced. One generation per condition, 12 minutes, medium effort, concurrency two." };
await writeFile(join(output, "campaign.json"), JSON.stringify(manifest, null, 2));
const results: any[] = [];
for (let i = 0; i < cells.length; i += 2) await Promise.all(cells.slice(i, i + 2).map(async cell => {
  if (sourceFingerprint(snapshot) !== fingerprint) throw new Error("Frozen evaluator changed");
  const id = `${cell.task}--${cell.model}--vanilla`, directory = join(output, id);
  const command = ["bun", join(snapshot, "skills/blender-agent-benchmark/scripts/run_benchmark.ts"),
    "--suite", "spatial", "--tasks", cell.task, "--agent", cell.agent, "--model", cell.model,
    "--mode", "baseline", "--condition-label", "vanilla", "--reasoning", "medium", "--timeout-minutes", "12",
    "--bypass-approvals", "--output", directory];
  console.log(`START ${id}`);
  const child = Bun.spawn(command, { cwd: output, stdout: Bun.file(join(output, `${id}.log`)), stderr: Bun.file(join(output, `${id}.stderr.log`)), windowsHide: true });
  await writeFile(join(output, `${id}.process.json`), JSON.stringify({ pid: child.pid, command, startedAt: new Date().toISOString() }, null, 2));
  const exitCode = await child.exited;
  const summary = await read(join(directory, "summary.json"));
  const plugin = await read(join(pluginRuns, `${cell.task}--${cell.model}--current`, "summary.json"));
  const mismatches = provenanceMismatches(summary, plugin, [cell.task]);
  for (const field of ["agentVersion", "model", "reasoning", "scorerVersion", "evidenceSettingsVersion", "evidencePresentation"])
    if (summary[field] !== plugin[field]) mismatches.push(`Changed ${field}`);
  if (summary.executionMode !== "baseline" || summary.skillRoot || summary.guidanceHash) mismatches.push("Vanilla condition was contaminated");
  results.push({ ...cell, directory, exitCode, mismatches, score: summary.meanAutomatedScore, hardGatePasses: summary.hardGatePasses });
  await writeFile(join(output, "progress.json"), JSON.stringify(results, null, 2));
  console.log(`DONE ${id} score=${summary.meanAutomatedScore} mismatches=${mismatches.length}`);
}));
await writeFile(join(output, "campaign-results.json"), JSON.stringify({ ...manifest, completedAt: new Date().toISOString(), results }, null, 2));
if (results.some(result => result.mismatches.length)) process.exitCode = 1;
