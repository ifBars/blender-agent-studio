import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SPATIAL_TASKS } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/spatial-tasks";
import { scoreSubmission, SCORER_VERSION } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/score";
import { sha256, taskFingerprint, provenanceMismatches } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance";
import { assertVanillaPluginConditions } from "./comparison-contract";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const vanillaRuns = argument("--vanilla-runs"), pluginRuns = argument("--plugin-runs"), judging = argument("--judging");
if (!vanillaRuns || !pluginRuns || !judging) throw new Error("--vanilla-runs, --plugin-runs and --judging are required");
const judgments = resolve(judging);
const prefix = "benchmarks/plugin-vs-vanilla";
const output = resolve(import.meta.dir, "../site/public", prefix);
await mkdir(output, { recursive: true });
const titles: Record<string, string> = { "gpt-6-astra": "GPT 6 Astra", "gpt-6.1-sol": "GPT 6.1 Sol", "claude-opus-5-5": "Opus 5.5", "claude-sonnet-5-5": "Sonnet 5.5" };
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const pairs = [];
for (const task of SPATIAL_TASKS) for (const [model, modelTitle] of Object.entries(titles)) {
  const id = `${task.id}--${model}`, reviewPath = join(judgments, id, "comparison-summary.json");
  const paths = [join(resolve(vanillaRuns), `${id}--vanilla`, "summary.json"), join(resolve(pluginRuns), `${id}--current`, "summary.json")];
  if (!existsSync(reviewPath) || paths.some(path => !existsSync(path))) {
    if (process.argv.includes("--allow-partial")) continue;
    throw new Error(`Comparison is incomplete: ${id}`);
  }
  const review = await read(reviewPath), conditions: Record<string, any> = {};
  const summaries = await Promise.all(paths.map(read));
  assertVanillaPluginConditions(summaries[0], summaries[1]);
  const mismatches = provenanceMismatches(summaries[0], summaries[1], [task.id]);
  for (const field of ["agentVersion", "scorerVersion", "evidenceSettingsVersion", "evidencePresentation"])
    if (summaries[0][field] !== summaries[1][field]) mismatches.push(`Changed ${field}`);
  if (mismatches.length || review.regressionGate?.configurationMismatches?.length) throw new Error(`Uncontrolled pair: ${id}: ${mismatches.join(", ")}`);
  if (review.baselineMode !== summaries[0].mode || review.candidateMode !== summaries[1].mode ||
      review.generationModel !== model || review.comparisons?.length !== 1 ||
      review.comparisons[0].taskId !== task.id || review.comparisons[0].judgeResults?.length !== 2)
    throw new Error(`Judgments do not match this pair: ${id}`);
  const mappings = review.comparisons[0].judgeResults.map((judge: any) => judge.mapping);
  if (mappings.some((mapping: any) => new Set([mapping.A, mapping.B]).size !== 2 ||
      ![mapping.A, mapping.B].includes(summaries[0].mode) || ![mapping.A, mapping.B].includes(summaries[1].mode)) ||
      mappings[0].A !== mappings[1].B)
    throw new Error(`Judgments are not counterbalanced: ${id}`);
  for (const [index, condition] of ["vanilla", "plugin"].entries()) {
    const summary = summaries[index], result = summary.results[0], workdir = result.workdir;
    for (const [file, expected] of Object.entries(result.artifactHashes ?? {}))
      if (sha256(await readFile(join(workdir, file))) !== expected) throw new Error(`Artifact changed: ${id}/${file}`);
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
      images[view] = `${prefix}/${task.id}/${model}/${condition}/${view}.png`;
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
      executionMode: summary.executionMode, guidanceHash: summary.guidanceHash,
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
    return { id: criterion.id, label: criterion.id.replaceAll("_", " "), question: criterion.question, critical: criterion.critical, vanilla: counts(summaries[0].mode), plugin: counts(summaries[1].mode) };
  });
  const first = comparison.judgeResults[0];
  const names: Record<string, string> = { [summaries[0].mode]: "the no-plugin result", [summaries[1].mode]: "the plugin result" };
  const note = first.result.rationale.replace(/\b[AB]\b/g, (side: "A" | "B") => names[first.mapping[side]])
    .replace(/(^|[.!?]\s+)the /g, "$1The ");
  pairs.push({ task: task.id, taskTitle: task.title, model, modelTitle, ...conditions,
    votes: review.visualVotes, note: `One review noted: ${note}`, criteria, rawReview: comparison,
  });
}
const dataset = { schemaVersion: 2, experiment: "vanilla_vs_plugin", generatedAt: new Date().toISOString(), experimentDate: "2026-10-02", pairs,
  framing: "Same fixed view and neutral studio preset. Each submitted scene is framed to fit, including saved staging geometry. Oversized staging can make the asset appear small. These are separate generations, not a registered geometric diff.",
  limitation: "One generation per condition; two counterbalanced Astra judgments of the same images. Vanilla runs were collected later and paired with the existing frozen plugin runs; generation order was not counterbalanced. With plugin means pinned skill workflows and bundled scripts, not an MCP ablation. Concurrent times are not a latency benchmark. Structural scores are proxies, not visual quality or proof of contact.",
  correction: "The stool hardware-name rubric now recognizes screw, rivet and fastener in addition to hardware, pin and bolt. Raw scores and original artifact hashes are retained. No geometry or visual judgments were changed." };
await writeFile(join(output, "comparison.json"), JSON.stringify(dataset, null, 2));
console.log(`Prepared ${pairs.length} complete image pairs in ${output}`);
