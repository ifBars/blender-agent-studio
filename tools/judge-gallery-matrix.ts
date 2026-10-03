import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const runs = resolve(process.argv[2] ?? ""), output = resolve(process.argv[3] ?? "");
const reviewRuns = process.argv[4] ? resolve(process.argv[4]) : runs;
if (!process.argv[2] || !process.argv[3]) throw new Error("Usage: bun tools/judge-gallery-matrix.ts <runs> <fresh-output>");
if (existsSync(output)) throw new Error("Judging directory already exists");
const manifest = await Bun.file(join(runs, "campaign.json")).json();
await mkdir(output, { recursive: true });
const done = new Set<string>(), results: any[] = [];
while (done.size < manifest.pairs.length) {
  for (const pair of manifest.pairs) {
    const id = `${pair.task}--${pair.model}`;
    if (done.has(id)) continue;
    const baseline = join(reviewRuns, `${id}--vanilla/summary.json`), candidate = join(reviewRuns, `${id}--plugin/summary.json`);
    if (!existsSync(baseline) || !existsSync(candidate)) continue;
    const command = ["bun", join(manifest.snapshot, "skills/blender-agent-benchmark/scripts/compare_runs.ts"),
      "--baseline", baseline, "--candidate", candidate, "--output", join(output, id),
      "--judge-model", "gpt-6-astra", "--judge-reasoning", "medium", "--judges", "2"];
    console.log(`JUDGE ${id}`);
    const child = Bun.spawn(command, { cwd: output, stdout: Bun.file(join(output, `${id}.log`)), stderr: Bun.file(join(output, `${id}.stderr.log`)), windowsHide: true });
    const timer = setTimeout(() => { Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore", windowsHide: true }); }, 10 * 60_000);
    const exitCode = await child.exited; clearTimeout(timer);
    results.push({ id, command, exitCode }); done.add(id);
    await writeFile(join(output, "progress.json"), JSON.stringify(results, null, 2));
    console.log(`JUDGED ${id} exit=${exitCode}`);
  }
  if (existsSync(join(reviewRuns, reviewRuns === runs ? "campaign-results.json" : "review-ready.json")) && manifest.pairs.every((p: any) => {
    const id = `${p.task}--${p.model}`;
    return done.has(id) || !existsSync(join(reviewRuns, `${id}--vanilla/summary.json`)) || !existsSync(join(reviewRuns, `${id}--plugin/summary.json`));
  })) break;
  await Bun.sleep(20_000);
}
await writeFile(join(output, "judging-results.json"), JSON.stringify({ results, missing: manifest.pairs.filter((p: any) => !done.has(`${p.task}--${p.model}`)) }, null, 2));
