import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { sha256, provenanceMismatches } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance";
import { assertVanillaPluginConditions } from "./comparison-contract";
import { assertCompleteGallery, selectHistoricalRows } from "./gallery-matrix";

const arg = (name: string) => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`); return resolve(process.argv[i + 1]); };
const existingPath = arg("--existing-data"), runs = arg("--runs"), reviewRuns = arg("--review-runs"), judging = arg("--judging"), output = arg("--output"), blender = arg("--blender");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const existing = await read(existingPath), manifest = await read(join(runs, "campaign.json"));
const publicRoot = resolve(import.meta.dir, "../site/public"), prefix = "benchmarks/gallery-matrix";
const titles: Record<string, string> = { "gpt-6-astra": "GPT 6 Astra", "gpt-6.1-sol": "GPT 6.1 Sol", "claude-opus-5-5": "Opus 5.5", "claude-sonnet-5-5": "Sonnet 5.5" };
await mkdir(output, { recursive: true });

// Preserve paired attempts. Never choose each side independently or relabel GPT 6 Sol.
const pairs: any[] = selectHistoricalRows(existing.pairs);
const historical = pairs.find((p: any) => p.task === "signal_lantern" && p.model === "gpt-6-sol");
if (!historical || historical.repetition !== 3) throw new Error("Historical lantern run 3 is required");
historical.modelTitle = "GPT 6 Sol (historical)";
historical.selection = "Run 3 selected by the gallery owner after viewing all three attempts. This is a curated example, not a random sample or an aggregate result.";
historical.limitation += ` ${historical.selection} Earlier attempts remain in the archived gallery release.`;
for (const pair of pairs) for (const condition of [pair.vanilla, pair.plugin]) {
  for (const [images, hashes] of [[condition.images, condition.imageHashes], [condition.originalImages, condition.originalImageHashes]]) {
    for (const [view, oldPath] of Object.entries(images) as Array<[string, string]>) {
      const bytes = await readFile(join(publicRoot, oldPath));
      if (sha256(bytes) !== hashes[view]) throw new Error(`Existing image changed: ${oldPath}`);
      const destination = oldPath.replace(/^benchmarks\/gallery-v2\//, `${prefix}/`);
      if (destination === oldPath) throw new Error("Expected the expanded HD gallery as input");
      await mkdir(dirname(join(publicRoot, destination)), { recursive: true });
      await copyFile(join(publicRoot, oldPath), join(publicRoot, destination)); images[view] = destination;
    }
  }
}

for (const cell of manifest.pairs) {
  const key = `${cell.task}--${cell.model}`, id = `${key}--r01`;
  const summaries = await Promise.all(["vanilla", "plugin"].map(c => read(join(reviewRuns, `${key}--${c}/summary.json`))));
  const rawSummaries = await Promise.all(["vanilla", "plugin"].map(c => read(join(runs, `${key}--${c}/summary.json`))));
  assertVanillaPluginConditions(summaries[0], summaries[1]);
  const mismatches = provenanceMismatches(summaries[0], summaries[1], [cell.task]);
  for (const field of ["agentVersion", "scorerVersion", "evidenceSettingsVersion", "evidencePresentation"])
    if (summaries[0][field] !== summaries[1][field]) mismatches.push(`Changed ${field}`);
  const review = await read(join(judging, key, "comparison-summary.json"));
  if (mismatches.length || review.regressionGate.configurationMismatches.length) throw new Error(`Uncontrolled pair ${key}: ${mismatches}`);
  if (review.baselineMode !== summaries[0].mode || review.candidateMode !== summaries[1].mode || review.generationModel !== cell.model || review.comparisons.length !== 1)
    throw new Error(`Wrong review: ${key}`);
  const comparison = review.comparisons[0], judges = comparison.judgeResults;
  if (comparison.taskId !== cell.task || judges.length !== 2 || judges[0].mapping.A !== judges[1].mapping.B ||
    judges.some((j: any) => new Set([j.mapping.A, j.mapping.B]).size !== 2 || ![j.mapping.A, j.mapping.B].includes(review.baselineMode) || ![j.mapping.A, j.mapping.B].includes(review.candidateMode)))
    throw new Error(`Missing counterbalanced reviews: ${key}`);
  const pair: any = { id, task: cell.task, taskTitle: summaries[0].results[0].taskTitle, model: cell.model, modelTitle: titles[cell.model], repetition: 1,
    cohort: "October 2026 matrix expansion", judgeCount: 2,
    limitation: "One generation per condition, medium effort, 12-minute generation limit. Two counterbalanced Astra reviews. Conditions generated concurrently; time is not a latency benchmark. Skills and bundled scripts are pinned; this is not an MCP ablation.", rawReview: comparison,
    votes: { baseline: comparison.visualWinnerVotes.filter((v: string) => v === review.baselineMode).length, candidate: comparison.visualWinnerVotes.filter((v: string) => v === review.candidateMode).length, tie: comparison.visualWinnerVotes.filter((v: string) => v === "tie").length } };
  if (cell.task === "winch_drawbridge") pair.limitation += " This gallery shows still views; reviewers also received sampled animation frames when available.";
  for (const [index, name] of ["vanilla", "plugin"].entries()) {
    const summary = summaries[index], result = summary.results[0], rawResult = rawSummaries[index].results[0], native = join(result.workdir, "asset.blend");
    if (summary.evidencePresentation !== "neutral-staging-excluded-v1" || JSON.stringify(result.score) !== JSON.stringify(rawResult.score) || JSON.stringify(result.artifactHashes) !== JSON.stringify(rawResult.artifactHashes)) throw new Error("Review framing changed technical evidence");
    if (result.taskId !== cell.task) throw new Error("Wrong task result");
    for (const [file, expected] of Object.entries(result.artifactHashes))
      if (sha256(await readFile(join(result.workdir, file))) !== expected) throw new Error(`Changed source ${key}/${name}/${file}`);
    const metrics = await read(join(result.workdir, "metrics-blend.json"));
    const hidden: string[] = summary.reviewEvidence.hiddenStagingObjects;
    const sourceHash = sha256(await readFile(native)), views = ["perspective", "front", "back", "left", "right", "top"];
    if (sourceHash !== summary.reviewEvidence.sourceSha256) throw new Error("Review source differs");
    const renderDir = join(output, "renders", id, name), previewPath = join(renderDir, "preview.json");
    if (!existsSync(previewPath)) {
      if (existsSync(renderDir)) throw new Error(`Incomplete render, inspect before retrying: ${renderDir}`);
      await mkdir(dirname(renderDir), { recursive: true }); console.log(`RENDER ${key}/${name}`);
      const command = [blender, "--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python", resolve(import.meta.dir, "render-gallery-preview.py"), "--", "--input", native, "--output", renderDir, "--views", views.join(","), "--hide-objects-json", JSON.stringify(hidden)];
      const child = Bun.spawn(command, { stdout: Bun.file(join(output, `${key}--${name}.render.log`)), stderr: "pipe", windowsHide: true });
      const timer = setTimeout(() => { Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore", windowsHide: true }); }, 600_000);
      const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]); clearTimeout(timer);
      if (code !== 0) throw new Error(`Render failed ${key}/${name}: ${stderr}`);
    }
    const preview = await read(previewPath);
    if (preview.sourceSha256 !== sourceHash || sha256(await readFile(native)) !== sourceHash || preview.preset !== "gallery-cycles-v1" || JSON.stringify(preview.views) !== JSON.stringify(views) || JSON.stringify(preview.hiddenStagingObjects) !== JSON.stringify(hidden)) throw new Error("Preview provenance differs");
    const condition: any = { score: result.score.score, rawScore: result.score.score, hardGate: result.score.hardGatePass, rawHardGate: result.score.hardGatePass,
      seconds: Math.round(result.agent.durationMs / 1000), triangles: metrics.totals.triangles, images: {}, imageHashes: {}, originalImages: {}, originalImageHashes: {}, rawImages: {}, rawImageHashes: {}, preview,
      reviewFraming: { policy: summary.reviewEvidence.policy, hiddenStagingObjects: hidden, sourceSha256: sourceHash },
      artifactHashes: result.artifactHashes, failedChecks: result.score.checks.filter((c: any) => !c.passed),
      executionMode: summary.executionMode, guidanceHash: summary.guidanceHash, skillFingerprint: summary.skillFingerprint, evaluatorFingerprint: summary.evaluatorFingerprint,
      generationTaskFingerprint: summary.taskFingerprints[cell.task], agentVersion: summary.agentVersion, modelRequested: summary.model, modelsObserved: result.agent.trace.observedModels ?? null, rawScorerVersion: summary.scorerVersion };
    for (const view of views) for (const quality of ["hd", "original", "raw"]) {
      const source = join(quality === "hd" ? renderDir : dirname(quality === "raw" ? rawResult.evidenceContactSheet : result.evidenceContactSheet), `${view}.png`), bytes = await readFile(source);
      if (quality === "hd" && (bytes.readUInt32BE(16) !== 1536 || bytes.readUInt32BE(20) !== 1536)) throw new Error("Wrong HD dimensions");
      const destination = `${prefix}/${id}/${name}/${quality}/${view}.png`;
      await mkdir(dirname(join(publicRoot, destination)), { recursive: true }); await copyFile(source, join(publicRoot, destination));
      condition[quality === "hd" ? "images" : quality === "raw" ? "rawImages" : "originalImages"][view] = destination;
      condition[quality === "hd" ? "imageHashes" : quality === "raw" ? "rawImageHashes" : "originalImageHashes"][view] = sha256(bytes);
    }
    pair[name] = condition;
  }
  pair.limitation += " Review framing excludes the same named studio meshes as HD. Original submission views and technical scores are preserved separately; oversized staging still fails the technical checks.";
  pair.criteria = judges[0].result.criterionResults.map((criterion: any) => {
    const counts = (mode: string) => { const total = { pass: 0, fail: 0, unclear: 0 }; for (const judge of judges) {
      const side = judge.mapping.A === mode ? "A" : "B", answer = judge.result.criterionResults.find((c: any) => c.criterionId === criterion.criterionId)?.[side] as keyof typeof total;
      total[answer in total ? answer : "unclear"]++;
    } return total; };
    return { id: criterion.criterionId, label: criterion.criterionId.replaceAll("_", " "), vanilla: counts(review.baselineMode), plugin: counts(review.candidateMode) };
  });
  pair.note = "One review noted: " + judges[0].result.rationale.replace(/\b[AB]\b/g, (side: "A" | "B") => judges[0].mapping[side] === review.baselineMode ? "the no-plugin result" : "the plugin result").replace(/(^|[.!?]\s+)the /g, "$1The ");
  pairs.push(pair); console.log(`READY ${key}`);
}
assertCompleteGallery(pairs);
pairs.sort((a: any, b: any) => Number(b.task === "signal_lantern") - Number(a.task === "signal_lantern") || (manifest.models.indexOf(a.model) < 0 ? 10 : manifest.models.indexOf(a.model)) - (manifest.models.indexOf(b.model) < 0 ? 10 : manifest.models.indexOf(b.model)));
const data = { schemaVersion: 2, experiment: "vanilla_vs_plugin", generatedAt: new Date().toISOString(), pairs, framing: "HD previews · 1536 px · denoised",
  limitation: "Separate historical cohorts; one paired generation per task/model except the explicitly curated historical lantern. No aggregate capability claim.",
  selection: { historicalLantern: { model: "gpt-6-sol", repetition: 3, requestedBy: "gallery owner", earlierAttempts: "https://github.com/ifBars/blender-agent-studio/releases/tag/gallery-hd-2026-10-02" } } };
await writeFile(join(publicRoot, prefix, "comparison.json"), JSON.stringify(data, null, 2));
console.log(`COMPLETE ${pairs.length} pairs`);
