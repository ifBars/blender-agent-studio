import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SPATIAL_TASKS } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/spatial-tasks";
import { scoreSubmission, SCORER_VERSION } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/score";
import { sha256, taskFingerprint } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const campaign = argument("--campaign"), judging = argument("--judging");
if (!campaign || !judging) throw new Error("--campaign and --judging are required");
const root = resolve(campaign), judgments = resolve(judging);
const output = resolve(import.meta.dir, "../site/public/benchmarks");
await mkdir(output, { recursive: true });
const titles: Record<string, string> = { "gpt-6-astra": "GPT 6 Astra", "gpt-6.1-sol": "GPT 6.1 Sol", "claude-opus-5-5": "Opus 5.5", "claude-sonnet-5-5": "Sonnet 5.5" };
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const pairs = [];
for (const task of SPATIAL_TASKS) for (const [model, modelTitle] of Object.entries(titles)) {
  const id = `${task.id}--${model}`, reviewPath = join(judgments, id, "comparison-summary.json");
  const paths = ["current", "guided"].map(condition => join(root, `${id}--${condition}`, "summary.json"));
  if (!existsSync(reviewPath) || paths.some(path => !existsSync(path))) continue;
  const review = await read(reviewPath), conditions: Record<string, any> = {};
  for (const [index, condition] of ["current", "guided"].entries()) {
    const summary = await read(paths[index]), result = summary.results[0], workdir = result.workdir;
    const blendMetrics = await read(join(workdir, "metrics-blend.json"));
    const glbMetrics = await read(join(workdir, "metrics-glb.json"));
    const reproduction = result.reproductionDirectory;
    const generation = reproduction && existsSync(join(reproduction, "generation-process.json")) ? await read(join(reproduction, "generation-process.json")) : null;
    const reproductionBlend = reproduction && existsSync(join(reproduction, "metrics-blend.json")) ? await read(join(reproduction, "metrics-blend.json")) : null;
    const reproductionGlb = reproduction && existsSync(join(reproduction, "metrics-glb.json")) ? await read(join(reproduction, "metrics-glb.json")) : null;
    const corrected = scoreSubmission({ task, agentExitCode: result.agent.exitCode,
      sourceExists: existsSync(join(workdir, "create_asset.py")), blendExists: existsSync(join(workdir, "asset.blend")), glbExists: existsSync(join(workdir, "asset.glb")),
      reproductionPass: generation?.exitCode === 0 && !!reproductionBlend?.hard_gate_pass && !!reproductionGlb?.hard_gate_pass,
      blendMetrics, glbMetrics });
    const images: Record<string, string> = {}, imageHashes: Record<string, string> = {};
    const destination = join(output, task.id, model, condition);
    await mkdir(destination, { recursive: true });
    for (const view of ["perspective", "front", "back", "left", "right", "top", "bottom"]) {
      const source = join(workdir, "evidence", `${view}.png`);
      if (!existsSync(source)) throw new Error(`Required evidence missing: ${id}/${condition}/${view}`);
      await copyFile(source, join(destination, `${view}.png`));
      images[view] = `benchmarks/${task.id}/${model}/${condition}/${view}.png`;
      imageHashes[view] = sha256(await readFile(source));
    }
    conditions[condition] = { score: corrected.score, rawScore: result.score.score, hardGate: corrected.hardGatePass, rawHardGate: result.score.hardGatePass,
      seconds: Math.round(result.agent.durationMs / 1000), triangles: blendMetrics.totals.triangles,
      images, imageHashes, failedChecks: corrected.checks.filter(check => !check.passed),
      artifactHashes: result.artifactHashes, generationTaskFingerprint: summary.taskFingerprints[task.id],
      correctedTaskFingerprint: taskFingerprint(task), modelRequested: summary.model,
      modelsObserved: result.agent.trace.observedModels ?? null, agentVersion: summary.agentVersion,
      evaluatorFingerprint: summary.evaluatorFingerprint, skillFingerprint: summary.skillFingerprint,
      rawScorerVersion: summary.scorerVersion, correctedScorerVersion: SCORER_VERSION,
    };
  }
  const comparison = review.comparisons[0];
  const criteria = task.visualCriteria.map(criterion => {
    const counts = (condition: string) => {
      const result = { pass: 0, fail: 0, unclear: 0 };
      for (const judge of comparison.judgeResults) {
        const side = judge.mapping.A === condition ? "A" : "B";
        const answer = judge.result.criterionResults.find((entry: any) => entry.criterionId === criterion.id)?.[side] as keyof typeof result | undefined;
        if (answer && answer in result) result[answer]++; else result.unclear++;
      }
      return result;
    };
    return { id: criterion.id, label: criterion.id.replaceAll("_", " "), question: criterion.question, critical: criterion.critical, current: counts("current"), guided: counts("guided") };
  });
  const first = comparison.judgeResults[0];
  const names: Record<string, string> = { current: "the current workflow", guided: "the added-checks workflow" };
  const note = first.result.rationale.replace(/\b[AB]\b/g, (side: "A" | "B") => names[first.mapping[side]])
    .replace(/(^|[.!?]\s+)the /g, "$1The ");
  pairs.push({ task: task.id, taskTitle: task.title, model, modelTitle, ...conditions,
    votes: review.visualVotes, note: `One review noted: ${note}`, criteria, rawReview: comparison,
  });
}
const dataset = { schemaVersion: 1, generatedAt: new Date().toISOString(), experimentDate: "2026-10-02", pairs,
  framing: "Same fixed view and neutral studio preset. Each asset is framed to fit; these are separate generations, not a registered geometric diff.",
  limitation: "One generation per condition; two counterbalanced Astra judgments of the same images. Concurrent generation times are context, not a latency benchmark. Structural scores are proxies, not visual quality or proof of contact.",
  correction: "The stool hardware-name rubric now recognizes screw, rivet and fastener in addition to hardware, pin and bolt. Raw scores and original artifact hashes are retained. No geometry or visual judgments were changed." };
await writeFile(join(output, "spatial-pilot.json"), JSON.stringify(dataset, null, 2));
console.log(`Prepared ${pairs.length} complete image pairs in ${output}`);
