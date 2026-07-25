import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { scoreSubmission } from "./score.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function optionalJson(path: string): Promise<unknown | null> {
  return existsSync(path) ? await readJson(path) : null;
}

async function main(): Promise<void> {
  const summaryArg = argument("--summary");
  if (!summaryArg) {
    throw new Error("--summary is required");
  }
  const summaryPath = resolve(summaryArg);
  const output = resolve(
    argument("--output") ?? join(resolve(summaryPath, ".."), "summary-rescored.json"),
  );
  const summary = await readJson<{
    results: Array<{
      taskId: string;
      workdir: string;
      agent: { exitCode: number };
      score: unknown;
    }>;
    [key: string]: unknown;
  }>(summaryPath);

  const results = [];
  for (const result of summary.results) {
    const task = BENCHMARK_TASKS.find((item) => item.id === result.taskId);
    if (!task) {
      throw new Error(`Unknown task in summary: ${result.taskId}`);
    }
    const workdir = resolve(result.workdir);
    const reproductionBlend = (await optionalJson(
      join(workdir, "reproduction", "metrics-blend.json"),
    )) as { hard_gate_pass?: boolean } | null;
    const reproductionGlb = (await optionalJson(
      join(workdir, "reproduction", "metrics-glb.json"),
    )) as { hard_gate_pass?: boolean } | null;
    const score = scoreSubmission({
      task,
      agentExitCode: result.agent.exitCode,
      sourceExists: existsSync(join(workdir, "create_asset.py")),
      reproductionPass:
        Boolean(reproductionBlend?.hard_gate_pass) &&
        Boolean(reproductionGlb?.hard_gate_pass),
      blendExists: existsSync(join(workdir, "asset.blend")),
      glbExists: existsSync(join(workdir, "asset.glb")),
      blendMetrics: (await optionalJson(join(workdir, "metrics-blend.json"))) as never,
      glbMetrics: (await optionalJson(join(workdir, "metrics-glb.json"))) as never,
    });
    results.push({ ...result, score });
  }

  const rescored = {
    ...summary,
    rescoredAt: new Date().toISOString(),
    scorerVersion: 2,
    hardGatePasses: results.filter((item) => item.score.hardGatePass).length,
    meanAutomatedScore: Number(
      (
        results.reduce((sum, item) => sum + item.score.score, 0) / results.length
      ).toFixed(2),
    ),
    results,
  };
  await writeFile(output, JSON.stringify(rescored, null, 2), "utf8");
  process.stdout.write(`${output}\n`);
}

await main();
