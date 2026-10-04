import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { scoreSubmission, SCORER_VERSION } from "./score.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";
import {sha256, evaluatorFingerprint} from "./provenance.ts";
import {verifyAuthoredEvidence} from './evidence-provenance';

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
  if (output === summaryPath || existsSync(output)) throw new Error("Choose a fresh rescore output; preserve original evidence");
  const summary = await readJson<{
    results: Array<{
      taskId: string;
      workdir: string;
      reproductionDirectory?: string | null;
      reproductionEvidenceDirectory?: string | null;
      agent: { exitCode: number };
      score: unknown;
      rawScore?: unknown;
      artifactHashes?: Record<string,string>;
    }>;
    [key: string]: unknown;
  }>(summaryPath);

  const results = [];
  const evidenceArg=argument('--evidence-directory'), reproductionEvidenceArg=argument('--reproduction-evidence-directory');
  if ((evidenceArg||reproductionEvidenceArg) && summary.results.length!==1) throw new Error('Evidence overrides require a single-task summary');
  for (const result of summary.results) {
    const task = BENCHMARK_TASKS.find((item) => item.id === result.taskId);
    if (!task) {
      throw new Error(`Unknown task in summary: ${result.taskId}`);
    }
    const workdir = resolve(result.workdir);
    for (const [file, expected] of Object.entries(result.artifactHashes ?? {}))
      if (sha256(await readFile(join(workdir,file))) !== expected) throw new Error(`Artifact changed since generation: ${result.taskId}/${file}`);
    const reproductionDir = result.reproductionDirectory ?? join(workdir, "reproduction");
    const reproductionProcess = await optionalJson(join(reproductionDir, "generation-process.json")) as {exitCode?: number} | null;
    const reproductionBlend = (await optionalJson(
      join(reproductionDir, "metrics-blend.json"),
    )) as { hard_gate_pass?: boolean } | null;
    const reproductionGlb = (await optionalJson(
      join(reproductionDir, "metrics-glb.json"),
    )) as { hard_gate_pass?: boolean } | null;
    const authoredRenderEvidence = await optionalJson(join(workdir, 'result.json')) as {authoredRenderEvidence?: {passed:boolean; missingDependencies:unknown[]}} | null;
    const evidenceOverride=evidenceArg ? await verifyAuthoredEvidence(resolve(evidenceArg),join(workdir,'asset.blend'),task.authoredCameras??[]) : null;
    if((evidenceArg||reproductionEvidenceArg)&&!task.authoredCameras)throw new Error('Evidence overrides require authored-camera tasks');
    const reproductionOverride=reproductionEvidenceArg ? await verifyAuthoredEvidence(resolve(reproductionEvidenceArg),join(reproductionDir,'asset.blend'),task.authoredCameras!) : null;
    const reproductionRender = await optionalJson(join(reproductionEvidenceArg ? resolve(reproductionEvidenceArg) : result.reproductionEvidenceDirectory ?? join(reproductionDir,'authored-evidence'), 'render-manifest.json')) as {status?:string; preflight?:{missingDependencies?:unknown[]}; renders?:unknown[]} | null;
    const score = scoreSubmission({
      task,
      agentExitCode: result.agent.exitCode,
      sourceExists: existsSync(join(workdir, "create_asset.py")),
      reproductionPass:
        reproductionProcess?.exitCode === 0 &&
        Boolean(reproductionBlend?.hard_gate_pass) &&
        (task.renderOnly || Boolean(reproductionGlb?.hard_gate_pass)) &&
        (!task.authoredCameras || (reproductionRender?.status === 'complete' && reproductionRender.renders?.length === task.authoredCameras.length &&
          reproductionRender.preflight?.missingDependencies?.length === 0)) &&
        (!task.wholeScene || existsSync(join(reproductionDir, "scene_manifest.json"))),
      blendExists: existsSync(join(workdir, "asset.blend")),
      glbExists: existsSync(join(workdir, "asset.glb")),
      authoredRenderEvidence: evidenceOverride ?? authoredRenderEvidence?.authoredRenderEvidence,
      iterationReviewExists: existsSync(join(workdir, "iteration_review.json")),
      videoEvidence: (await optionalJson(join(workdir, "video-probe.json"))) as never,
      motionEvidence: await optionalJson(join(workdir, "motion-blend.json")),
      exportedMotionEvidence: await optionalJson(join(workdir, "motion-glb.json")),
      gameSceneEvidence: await optionalJson(join(workdir, "game-scene-evaluation", "result.json")) as { technicalPass: boolean; errors: string[] } | null,
      blendMetrics: (await optionalJson(join(workdir, "metrics-blend.json"))) as never,
      glbMetrics: (await optionalJson(join(workdir, "metrics-glb.json"))) as never,
    });
    results.push({ ...result, rawScore:result.rawScore ?? result.score, score,
      ...(evidenceOverride ? {rawEvidenceDirectory:(result as any).evidenceDirectory??join(workdir,'evidence'),rawEvidenceContactSheet:(result as any).evidenceContactSheet,
        evidenceDirectory:resolve(evidenceArg!),evidenceContactSheet:join(resolve(evidenceArg!),'contact_sheet.png'),authoredRenderEvidence:evidenceOverride} : {}),
      ...(reproductionOverride ? {reproductionEvidenceDirectory:resolve(reproductionEvidenceArg!),reproductionEvidenceOverride:reproductionOverride} : {}),
    });
  }

  const rescored = {
    ...summary,
    rescoredAt: new Date().toISOString(),
    rescoreSourceSummary:summaryPath,
    rawScorerVersion:summary.rawScorerVersion ?? summary.scorerVersion,
    rescoreEvaluatorFingerprint:await evaluatorFingerprint(),
    scorerVersion: SCORER_VERSION,
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
