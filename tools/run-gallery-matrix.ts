import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cliCodexTransport, sourceFingerprint } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/pinned-mcp";
import { GALLERY_MODELS } from "./gallery-matrix";
import { BENCHMARK_TASKS } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/tasks";
import {sha256} from '../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance';

// Bound the whole tree, including agent-authored Blender commands, before work starts.
if (process.platform === "win32" && process.env.BAS_RESOURCE_JOB !== "windows-cpu-hard-cap-v1" && !process.argv.includes("--request-pause")) {
  const configuration = Buffer.from(JSON.stringify({command:[process.execPath,...process.argv.slice(1)],cpuPercent:20})).toString("base64");
  const guard = Bun.spawn(["powershell","-NoProfile","-File",join(import.meta.dir,"windows-resource-job.ps1"),"-ConfigurationBase64",configuration],{stdout:"inherit",stderr:"inherit",windowsHide:true});
  process.exit(await guard.exited);
}

const option = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const arg = (name: string) => { const value = option(name); if (!value) throw new Error(`Missing ${name}`); return resolve(value); };
const output = arg("--output");
if (process.argv.includes("--request-pause")) {
  if (!existsSync(join(output,"campaign.json")) || existsSync(join(output,"campaign-results.json"))) throw new Error("No unfinished campaign to pause");
  await writeFile(join(output,"pause-request.json"),JSON.stringify({requestedAt:new Date().toISOString()},null,2));
  console.log("Pause requested. Current paired generations finish before the supervisor exits.");
  process.exit(0);
}
const snapshot = arg("--skill-root"), resume = process.argv.includes("--resume");
const read = async (path:string) => JSON.parse(await readFile(path,"utf8"));
const prior = resume ? await read(join(output,"campaign.json")) : null;
const existing = await read(arg("--existing-data"));
const tasks = option("--tasks")?.split(",") ?? prior?.tasks ?? ["signal_lantern", "tabletop_press", "winch_drawbridge"];
const timeoutMinutes = Number(option("--timeout-minutes") ?? prior?.timeoutMinutes ?? 12);
const concurrency = Number(option("--concurrency") ?? 1);
const guidanceFile = resolve(option("--guidance-file") ?? join(import.meta.dir,"benchmark-resource-guidance.md"));
const guidanceHash=sha256(await readFile(guidanceFile));
const codexTransport = cliCodexTransport(), fingerprint = sourceFingerprint(snapshot);
if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 60) throw new Error("Generation limit must be between 1 and 60 minutes");
if (concurrency !== 1) throw new Error("Use --concurrency 1: Blender generations run sequentially to preserve desktop responsiveness");
if (new Set(tasks).size !== tasks.length || tasks.some((id:string) => !BENCHMARK_TASKS.some(task => task.id === id))) throw new Error("Unknown or repeated campaign task");
if (!resume && existsSync(output)) throw new Error("Choose a fresh campaign directory, or explicitly --resume; never overwrite a generation");
const pairs = prior?.pairs ?? tasks.flatMap((task:string) => GALLERY_MODELS.filter(model => !existing.pairs.some((p: any) => p.task === task && p.model === model)).map(model => ({ task, model })));
const cells = prior?.cells ?? pairs.flatMap((pair:any, index:number) => (index % 2 ? ["plugin", "vanilla"] : ["vanilla", "plugin"]).map(condition => ({ ...pair, condition })));
const manifest = prior ?? { experiment: "vanilla_vs_plugin", startedAt: new Date().toISOString(), snapshot, fingerprint, models:GALLERY_MODELS, tasks, pairs, cells, reasoning: "medium", timeoutMinutes, codexTransport, concurrency, repetitions: 1 };
if(prior?.resourcePolicy?.guidanceHash && prior.resourcePolicy.guidanceHash!==guidanceHash)throw new Error('Resume resource guidance changed');
manifest.resourcePolicy = {cpuHardCapPercent:process.platform === "win32" ? 20 : null,priority:process.platform === "win32" ? "BelowNormal" : null,concurrency,requestedBlenderThreads:2,guidanceFile,guidanceHash};
if (prior && (resolve(prior.snapshot) !== snapshot || prior.fingerprint !== fingerprint || JSON.stringify(prior.tasks) !== JSON.stringify(tasks) || JSON.stringify(prior.models) !== JSON.stringify(GALLERY_MODELS) || prior.timeoutMinutes !== timeoutMinutes || (prior.codexTransport ?? "auto") !== codexTransport || prior.reasoning !== "medium" || prior.repetitions !== 1))
  throw new Error("Resume controls differ from the original campaign");
if (prior && existsSync(join(output,"campaign-results.json"))) throw new Error("Campaign already complete");
if (prior && existsSync(join(output,"pause-request.json"))) await rename(join(output,"pause-request.json"),join(output,`pause-request-resumed-${Date.now()}.json`));
if (prior && concurrency !== prior.concurrency) {
  manifest.schedulingAmendments = [...(manifest.schedulingAmendments ?? []), {at:new Date().toISOString(),previousConcurrency:prior.concurrency,concurrency,reason:"Explicit queue concurrency change; generation controls unchanged. Times are descriptive, not latency measurements."}];
  manifest.concurrency = concurrency;
}
await mkdir(output, { recursive: true });
await writeFile(join(output, "campaign.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(output,"supervisor.json"),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),resumed:resume},null,2));
const results: any[] = resume && existsSync(join(output,"progress.json")) ? await read(join(output,"progress.json")) : [];
let save = Promise.resolve();
const persist = () => { save = save.then(() => writeFile(join(output,"progress.json"),JSON.stringify(results,null,2))); return save; };
const alive = (pid:number) => {try {process.kill(pid,0);return true;} catch {return false;} };
const commandFor = (cell:any) => ["bun", join(snapshot, "skills/blender-agent-benchmark/scripts/run_benchmark.ts"),
  "--suite", BENCHMARK_TASKS.find(task => task.id === cell.task)!.suites[0], "--tasks", cell.task, "--model", cell.model, "--agent", cell.model.startsWith("claude") ? "claude-code" : "codex",
  "--mode", cell.condition === "vanilla" ? "baseline" : "skills", "--condition-label", cell.condition,
  "--reasoning", "medium", "--timeout-minutes", String(timeoutMinutes), "--bypass-approvals", "--output", join(output,`${cell.task}--${cell.model}--${cell.condition}`),
  "--codex-transport", codexTransport, ...(guidanceFile ? ["--guidance-file",guidanceFile] : []), ...(cell.condition === "plugin" ? ["--skill-root", snapshot] : [])];
async function runCell(cell:any) {
  if (results.some(result => result.task === cell.task && result.model === cell.model && result.condition === cell.condition)) return;
  if (sourceFingerprint(snapshot) !== fingerprint) throw new Error("Pinned plugin changed");
  const id = `${cell.task}--${cell.model}--${cell.condition}`, directory = join(output,id), recordPath = join(output,`${id}.process.json`), command = commandFor(cell);
  let record:any, child:ReturnType<typeof Bun.spawn> | null = null;
  if (existsSync(recordPath)) {
    record = await read(recordPath);
    if (JSON.stringify(record.command) !== JSON.stringify(command)) throw new Error(`Recorded command differs: ${id}`);
    if (!record.completedAt && alive(record.pid)) {
      const probe = Bun.spawn(["powershell","-NoProfile","-Command",`(Get-CimInstance Win32_Process -Filter 'ProcessId=${Number(record.pid)}').CommandLine`],{stdout:"pipe",stderr:"ignore",windowsHide:true});
      const line = await new Response(probe.stdout).text(); await probe.exited;
      if (!line.includes(directory) || !line.includes("run_benchmark.ts")) throw new Error(`Recorded PID no longer owns this generation: ${id}`);
      console.log(`RESUME ${id} pid=${record.pid}`);
    }
  } else {
    if (existsSync(directory)) throw new Error(`Unrecorded attempt directory exists: ${id}`);
    console.log(`START ${id}`);
    child = Bun.spawn(command,{cwd:output,stdout:Bun.file(join(output,`${id}.log`)),stderr:Bun.file(join(output,`${id}.stderr.log`)),windowsHide:true});
    record = {command,pid:child.pid,startedAt:new Date().toISOString()};
    await writeFile(recordPath,JSON.stringify(record,null,2));
  }
  let timedOut = record.timedOut ?? false;
  const remaining = (timeoutMinutes + 20)*60_000 - (Date.now() - Date.parse(record.startedAt));
  const timer = setTimeout(() => {
    if (!alive(record.pid)) return;
    timedOut = true;
    Bun.spawn(["taskkill","/PID",String(record.pid),"/T","/F"],{stdout:"ignore",stderr:"ignore",windowsHide:true});
  },Math.max(1,remaining));
  let exitCode = record.exitCode ?? null;
  if (!record.completedAt) {
    if (child) exitCode = await child.exited;
    else while (alive(record.pid)) await Bun.sleep(5000);
  }
  clearTimeout(timer);
  const summaryPath = join(directory,"summary.json"), summary = existsSync(summaryPath) ? await read(summaryPath) : null;
  // A resumed parent cannot recover an orphan's OS exit code. Its original agent exit remains in the summary.
  const recovered = !child && !record.completedAt;
  results.push({...cell,exitCode,timedOut,recovered,summaryPath,score:summary?.meanAutomatedScore ?? null,hardGatePasses:summary?.hardGatePasses ?? null});
  await writeFile(recordPath,JSON.stringify({...record,exitCode,timedOut,recovered,completedAt:record.completedAt ?? new Date().toISOString()},null,2));
  await persist(); console.log(`DONE ${id} exit=${exitCode ?? "unavailable after resume"} score=${summary?.meanAutomatedScore ?? "missing"}`);
}
let next = 0;
await Promise.all(Array.from({length:1},async () => {
  while (next < pairs.length) {
    if (existsSync(join(output,"pause-request.json"))) break;
    const pair = pairs[next++];
    for (const cell of cells.filter((cell:any) => cell.task === pair.task && cell.model === pair.model)) await runCell(cell);
  }
}));
await save;
if (results.length < cells.length) {
  await writeFile(join(output,"paused.json"),JSON.stringify({pausedAt:new Date().toISOString(),completed:results.length,total:cells.length},null,2));
  console.log(`Paused after ${results.length} completed cells; --resume continues the existing campaign.`);
} else {
  await writeFile(join(output,"campaign-results.json"),JSON.stringify({...manifest,completedAt:new Date().toISOString(),results},null,2));
  console.log(`Completed ${results.length} cells`);
}
