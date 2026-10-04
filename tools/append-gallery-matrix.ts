import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { sha256, provenanceMismatches } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance";
import { BENCHMARK_TASKS } from "../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/tasks";
import { assertVanillaPluginConditions } from "./comparison-contract";
import { assertCompleteGallery, assertPublishedGallery, GALLERY_MODELS, GALLERY_TASKS } from "./gallery-matrix";
import { validateGalleryReview } from "./gallery-review";
import {SCORER_VERSION} from '../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/score';

const arg = (name: string) => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`); return resolve(process.argv[i + 1]); };
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const maybeRead = async (path: string) => existsSync(path) ? read(path) : null;
const runs = arg("--runs"), judging = arg("--judging"), output = arg("--output"), blender = arg("--blender");
const recoveryIndex = process.argv.indexOf("--recovery-runs"), recoveryJudgeIndex = process.argv.indexOf("--recovery-judging");
if ((recoveryIndex >= 0) !== (recoveryJudgeIndex >= 0)) throw new Error("Supply both recovery runs and judging directories");
const recoveryRuns = recoveryIndex >= 0 ? resolve(process.argv[recoveryIndex+1]) : null;
const recoveryJudging = recoveryJudgeIndex >= 0 ? resolve(process.argv[recoveryJudgeIndex+1]) : null;
const edgeIndex = process.argv.indexOf("--preview-edge"), previewEdge = Number(edgeIndex < 0 ? 1024 : process.argv[edgeIndex + 1]);
if (!Number.isSafeInteger(previewEdge) || previewEdge < 384 || previewEdge > 1536) throw new Error("Preview edge must be 384..1536 pixels");
const existing = await read(arg("--existing-data")), manifest = await read(join(runs, "campaign.json"));
const completedOnly = process.argv.includes('--completed-only');
const originalPreviews = process.argv.includes('--original-previews');
const requireHdPreviews = process.argv.includes('--require-hd-previews');
const resourceGuidanceHashes=new Set(await Promise.all(['benchmark-resource-guidance.md','benchmark-resource-guidance-v1.md'].map(async file=>sha256(await readFile(join(import.meta.dir,file))))));
if (!existsSync(join(runs, "campaign-results.json"))) throw new Error("Wait for the complete campaign, including failed attempts");
const recovery = recoveryRuns ? await read(join(recoveryRuns,"campaign-results.json")) : null;
const interrupted = recovery ? await read(join(runs,"supervisor-transition.json")) : null;
if (recovery && (recovery.fingerprint !== manifest.fingerprint || recovery.snapshot !== manifest.snapshot || recovery.reasoning !== manifest.reasoning || recovery.timeoutMinutes !== manifest.timeoutMinutes || recovery.codexTransport !== manifest.codexTransport)) throw new Error("Recovery campaign controls differ");
const publicRoot = resolve(import.meta.dir, "../site/public"), prefix = "benchmarks/gallery-matrix";
const titles: Record<string,string> = {"gpt-6-astra":"GPT 6 Astra", "gpt-6.1-sol":"GPT 6.1 Sol", "claude-opus-5-5":"Opus 5.5", "claude-sonnet-5-5":"Sonnet 5.5"};
await mkdir(output, {recursive:true});
// Existing images, judgments, scores and curation stay byte-for-byte equivalent.
const pairs = existing.pairs;
for (const pair of pairs) for (const condition of [pair.vanilla, pair.plugin]) {
  for (const [images, hashes] of [[condition.images, condition.imageHashes], [condition.originalImages ?? {}, condition.originalImageHashes ?? {}], [condition.rawImages ?? {}, condition.rawImageHashes ?? {}]])
    for (const [view, path] of Object.entries(images) as Array<[string,string]>)
      if (sha256(await readFile(join(publicRoot, path))) !== hashes[view]) throw new Error(`Existing evidence changed: ${path}`);
}
const execute = async (command: string[], log: string) => {
  const child = Bun.spawn(command, {stdout:Bun.file(log), stderr:Bun.file(log + ".stderr"), windowsHide:true});
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], {stdout:"ignore", stderr:"ignore", windowsHide:true}); }, 600_000);
  const code = await child.exited; clearTimeout(timer);
  return {code, timedOut};
};
const viewName = (path: string) => basename(path, ".png");
const cameraName = (name: string) => ({SceneHero:"hero", SceneReverse:"reverse", SceneDetail:"detail"} as Record<string,string>)[name] ?? name;
const png = async (path: string) => { const bytes = await readFile(path); if (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Invalid PNG ${path}`); return bytes; };
for (const cell of manifest.pairs) {
  const key = `${cell.task}--${cell.model}`, id = `${key}--r01`;
  if (completedOnly && ['vanilla','plugin'].some(name => !existsSync(join(runs, `${key}--${name}/summary.json`)))) {
    console.log(`UNAVAILABLE ${key}: no completed evaluator pair`); continue;
  }
  if (pairs.some((pair: any) => pair.task === cell.task && pair.model === cell.model)) throw new Error(`Duplicate pair ${key}`);
  const recovered = recovery?.pairs.some((pair:any) => pair.task === cell.task && pair.model === cell.model);
  if (recovered && ["vanilla","plugin"].some(name => existsSync(join(runs,`${key}--${name}/summary.json`)) || !interrupted.interrupted.includes(join(runs,`${key}--${name}`)))) throw new Error("Only explicitly interrupted, unscored attempts may receive a fresh replacement");
  const attemptRuns = recovered ? recoveryRuns! : runs, attemptJudging = recovered ? recoveryJudging! : judging;
  const summaries = await Promise.all(["vanilla", "plugin"].map(async name => await maybeRead(join(attemptRuns, `${key}--${name}/summary.json`)) ?? await read(join(attemptRuns, `${key}--${name}/run-manifest.json`))));
  const calibrated = await Promise.all(["vanilla", "plugin"].map(name => maybeRead(join(attemptRuns,`${key}--${name}/summary-rescored-v${SCORER_VERSION}.json`))));
  if (calibrated.some(Boolean) && !calibrated.every(Boolean)) throw new Error(`Calibrate both conditions before importing ${key}`);
  for (let i=0;i<2;i++) if (calibrated[i]) {
    if (calibrated[i].scorerVersion !== SCORER_VERSION || calibrated[i].rawScorerVersion !== summaries[i].scorerVersion || JSON.stringify(calibrated[i].results[0].artifactHashes) !== JSON.stringify(summaries[i].results[0].artifactHashes) || calibrated[i].results[0].workdir !== summaries[i].results[0].workdir)
      throw new Error(`Calibration changed provenance ${key}`);
  }
  if (calibrated[0] && calibrated[0].rescoreEvaluatorFingerprint !== calibrated[1].rescoreEvaluatorFingerprint) throw new Error(`Calibration evaluators differ ${key}`);
  const resourcePolicy=manifest.pairResourcePolicies?.[key]??manifest.resourcePolicy;
  const resourceGuidanceHash=resourceGuidanceHashes.has(summaries[0].guidanceHash)&&summaries[0].guidanceHash===summaries[1].guidanceHash?summaries[0].guidanceHash:undefined;
  assertVanillaPluginConditions(summaries[0], summaries[1],resourcePolicy?.concurrency===1&&resourcePolicy?.cpuHardCapPercent===20?resourceGuidanceHash:undefined);
  const mismatches = provenanceMismatches(summaries[0], summaries[1], [cell.task]);
  for (const field of ["agentVersion", "agentCli", "scorerVersion", "evidenceSettingsVersion", "evidencePresentation"])
    if (summaries[0][field] !== summaries[1][field]) mismatches.push(`Changed ${field}`);
  if (summaries[1].skillFingerprint !== manifest.fingerprint || mismatches.length) throw new Error(`Uncontrolled pair ${key}: ${mismatches}`);
  const review = await maybeRead(join(attemptJudging, key, "comparison-summary.json"));
  const comparison = review ? validateGalleryReview(review, cell.task, cell.model) : null;
  const judges = comparison?.judgeResults ?? [];
  const task = BENCHMARK_TASKS.find(task => task.id === cell.task)!;
  const pair: any = {id, task:cell.task, taskTitle:task.title, model:cell.model, modelTitle:titles[cell.model], repetition:1,
    cohort:"October 2026 scenes and game characters", judgeCount:judges.length, rawReview:comparison ?? null,
    resourcePolicy:manifest.pairResourcePolicies?.[key]??manifest.resourcePolicy??null,
    sharedResourceGuidanceHash:summaries[0].guidanceHash===resourceGuidanceHash&&summaries[1].guidanceHash===resourceGuidanceHash?resourceGuidanceHash:null,
    limitation:`One generation per condition, medium effort, ${manifest.timeoutMinutes}-minute generation limit. ${judges.length ? "Two counterbalanced Astra reviews." : "Visual reviews unavailable; no preference inferred."} Resource limits changed between cohorts; time is not a latency benchmark. Pinned skills and scripts; this is not an MCP ablation.`,
    votes:{baseline:comparison?.visualWinnerVotes.filter((v: string) => v === "vanilla").length ?? 0, candidate:comparison?.visualWinnerVotes.filter((v: string) => v === "plugin").length ?? 0, tie:comparison?.visualWinnerVotes.filter((v: string) => v === "tie").length ?? 0}};
  if (task.authoredCameras) pair.limitation += " Authored cameras and lighting are part of the result; cameras may differ between attempts. The slider is a side-by-side comparison, not an aligned geometry difference.";
  if (recovered) {
    pair.recovery = {reason:interrupted.reason,interruptedAttemptIds:[`${key}--vanilla`,`${key}--plugin`],replacementCampaign:basename(recoveryRuns!)};
    pair.limitation += " The original pair was interrupted by a supervisor transition before evaluation; one fresh replacement pair uses unchanged inputs and full limits. Interrupted artifacts remain archived without quality scores or preference votes.";
  }
  if (task.animationFrames?.length) pair.limitation += " Sampled pose frames are available in the View selector; these do not prove continuous animation quality.";
  if (calibrated[0]) pair.limitation += ` Technical scores use scorer ${SCORER_VERSION}; original scores and gates are retained. Any replacement evaluator images render the same hashed saved source and are recorded separately.`;
  for (const [index, name] of ["vanilla", "plugin"].entries()) {
    const summary = summaries[index], result = summary.results?.[0];
    const score = calibrated[index]?.results[0].score ?? result?.score;
    const workdir = result?.workdir ?? join(attemptRuns, `${key}--${name}`, `${cell.task}-r01`);
    for (const [file, expected] of Object.entries(result?.artifactHashes ?? {}))
      if (sha256(await readFile(join(workdir,file))) !== expected) throw new Error(`Changed artifact ${key}/${name}/${file}`);
    const evidenceResult=calibrated[index]?.results[0]??result;
    const evidenceDirectory=evidenceResult?.evidenceDirectory??(evidenceResult?.evidenceContactSheet?dirname(evidenceResult.evidenceContactSheet):join(workdir,'evidence'));
    const metrics = await maybeRead(join(workdir,"metrics-blend.json")), evidence = await maybeRead(join(evidenceDirectory,"evidence.json"));
    const originals: Record<string,string> = {};
    for (const entry of evidence?.views ?? []) {
      const path = typeof entry === "string" ? entry : entry.path;
      originals[typeof entry === "string" ? viewName(path) : cameraName(entry.camera)] = path;
    }
    for (const entry of evidence?.animation_frames ?? []) originals[viewName(entry.path)] = entry.path;
    // Recover completed camera views after a bounded render failed, without calling them complete evidence.
    if (!evidence && task.authoredCameras) for (const render of (await maybeRead(join(evidenceDirectory,"render-manifest.json")))?.renders ?? []) originals[cameraName(render.camera)] = render.path;
    const native = join(workdir,"asset.blend"), sourceHash = existsSync(native) ? sha256(await readFile(native)) : null;
    const previews: Record<string,string> = {}, renderDir = join(output,"renders",id,name);
    let preview: any = {description:"Original evidence is shown because this attempt has no complete preview.", hiddenStagingObjects:[]};
    if (originalPreviews) preview = {description:'Original camera evidence is shown at its recorded resolution; no additional preview render was performed.', hiddenStagingObjects:[]};
    if (sourceHash && (evidence || task.authoredCameras) && !originalPreviews) {
      await mkdir(dirname(renderDir), {recursive:true});
      let renderReport: any;
      if (task.authoredCameras) {
        const reportPath = join(renderDir,"render-manifest.json");
        if (!existsSync(renderDir)) {
          const command = [blender,"--background","--threads","2","--factory-startup","--disable-autoexec","--python-exit-code","1","--python",resolve(import.meta.dir,"../plugins/blender-agent-studio/skills/blender-rendering-workflow/scripts/render_scene.py"),"--","--input",native,"--output-dir",renderDir,"--max-edge",String(previewEdge),"--render-edge",String(previewEdge),"--samples","64","--time-limit","120","--device","OPTIX","--denoise","final",...task.authoredCameras.flatMap((camera: string) => ["--camera",camera])];
          console.log(`PREVIEW ${key}/${name}`); await execute(command,join(output,`${key}--${name}.render.log`));
        }
        renderReport = await maybeRead(reportPath);
        if (renderReport?.status === "complete" && renderReport.sourceSha256 === sourceHash) {
          for (const render of renderReport.renders) previews[cameraName(render.camera)] = render.path;
          if (Math.max(...renderReport.effective.resolution) > previewEdge) throw new Error("Cached scene preview exceeds the requested resolution cap");
          preview = {...renderReport, description:`Previews preserve authored cameras, lighting, materials and compositing, with a ${previewEdge} px resolution cap. Engine and sample settings are recorded in the data.`, hiddenStagingObjects:[]};
        }
      } else {
        const reportPath = join(renderDir,"preview.json");
        const views = Object.keys(originals).filter(view => !view.startsWith("frame_"));
        if (!existsSync(renderDir)) {
          console.log(`PREVIEW ${key}/${name}`);
          await execute([blender,"--background","--factory-startup","--disable-autoexec","--python-exit-code","1","--python",resolve(import.meta.dir,"render-gallery-preview.py"),"--","--input",native,"--output",renderDir,"--views",views.join(","),"--resolution",String(previewEdge)],join(output,`${key}--${name}.render.log`));
        }
        renderReport = await maybeRead(reportPath);
        if (renderReport?.sourceSha256 === sourceHash && renderReport.preset === "gallery-cycles-v2") {
          if (renderReport.resolution !== previewEdge) throw new Error("Cached character preview uses a different resolution");
          for (const view of renderReport.views) previews[view] = join(renderDir,`${view}.png`);
          preview = {...renderReport, description:`Still previews use a neutral Cycles studio at ${previewEdge} px with denoising. Pose frames retain the original review evidence.`};
        }
      }
      if (sha256(await readFile(native)) !== sourceHash) throw new Error(`Preview modified source ${key}/${name}`);
    }
    if (requireHdPreviews && task.authoredCameras && (preview.status !== 'complete' || Object.keys(previews).length !== task.authoredCameras.length || Math.max(...preview.effective.resolution) !== previewEdge))
      throw new Error(`Complete ${previewEdge}px authored previews are required: ${key}/${name}`);
    const condition: any = {score:score?.score ?? null, rawScore:result?.score.score ?? null, hardGate:score?.hardGatePass ?? false, rawHardGate:result?.score.hardGatePass ?? false,
      seconds:result ? Math.round(result.agent.durationMs/1000) : null, triangles:metrics?.totals?.triangles ?? null,
      images:{}, imageHashes:{}, imageDimensions:{}, originalImages:{}, originalImageHashes:{}, originalImageDimensions:{}, preview, evidenceUnavailable:!evidence,
      failedChecks:score?.checks.filter((c: any) => !c.passed) ?? [], rawFailedChecks:result?.score.checks.filter((c: any) => !c.passed) ?? [], failure:!result ? "Benchmark evaluator did not complete; score unavailable." : null,
      scorerVersion:calibrated[index]?.scorerVersion ?? summary.scorerVersion, rescoreEvaluatorFingerprint:calibrated[index]?.rescoreEvaluatorFingerprint ?? null,
      scoreCorrection:calibrated[index] ? `Scorer ${SCORER_VERSION} checks finite bounds for render-only scenes and recognizes ordinary food ingredient names. Geometry and export gates are unchanged. Raw scores are retained. Any repaired evaluator evidence uses the same saved source hash.` : null,
      evidenceDirectory,evaluatorEvidenceRepaired:Boolean(evidenceResult?.rawEvidenceDirectory),
      artifactHashes:result?.artifactHashes ?? {}, executionMode:summary.executionMode, guidanceHash:summary.guidanceHash, skillFingerprint:summary.skillFingerprint, evaluatorFingerprint:summary.evaluatorFingerprint,
      generationTaskFingerprint:summary.taskFingerprints[cell.task], agentVersion:summary.agentVersion, codexTransport:summary.codexTransport ?? null, modelRequested:summary.model, modelsObserved:result?.agent.trace.observedModels ?? null, rawScorerVersion:summary.scorerVersion};
    for (const view of new Set([...Object.keys(originals),...Object.keys(previews)])) for (const quality of ["original","preview"]) {
      const source = originals[view];
      if (quality === 'preview' && task.authoredCameras && Object.keys(previews).length && !previews[view]) continue;
      const path = quality === "preview" ? previews[view] ?? source : source;
      if (!path) continue;
      const bytes = await png(path), destination = `${prefix}/scene-character/${id}/${name}/${quality}/${view}.png`;
      await mkdir(dirname(join(publicRoot,destination)), {recursive:true}); await copyFile(path,join(publicRoot,destination));
      condition[quality === "preview" ? "images" : "originalImages"][view] = destination;
      condition[quality === "preview" ? "imageHashes" : "originalImageHashes"][view] = sha256(bytes);
      condition[quality === "preview" ? "imageDimensions" : "originalImageDimensions"][view] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    }
    pair[name] = condition;
  }
  // Failed attempts remain selectable; placeholders carry no visual judgment.
  const views = [...new Set([...Object.keys(pair.vanilla.images),...Object.keys(pair.plugin.images)])];
  if (!views.length) views.push("unavailable");
  for (const name of ["vanilla","plugin"]) for (const view of views) if (!pair[name].images[view]) {
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQl1b4DwAB8QFSLvMzmQAAAABJRU5ErkJggg==","base64");
    const path = `${prefix}/scene-character/${id}/${name}/unavailable.png`;
    await mkdir(dirname(join(publicRoot,path)),{recursive:true}); await writeFile(join(publicRoot,path),bytes);
    for (const quality of ["images","originalImages"]) pair[name][quality][view] = path;
    for (const quality of ["imageHashes","originalImageHashes"]) pair[name][quality][view] = sha256(bytes);
    for (const quality of ["imageDimensions","originalImageDimensions"]) pair[name][quality][view] = [1,1];
    pair[name].evidenceUnavailable = true;
  }
  pair.criteria = (judges[0]?.result.criterionResults ?? []).map((criterion: any) => {
    const counts = (mode: string) => { const total = {pass:0, fail:0, unclear:0}; for (const judge of judges) {
      const side = judge.mapping.A === mode ? "A" : "B", answer = judge.result.criterionResults.find((c: any) => c.criterionId === criterion.criterionId)?.[side] as keyof typeof total;
      total[answer in total ? answer : "unclear"]++;
    } return total; };
    return {id:criterion.criterionId,label:criterion.criterionId.replaceAll("_"," "),vanilla:counts("vanilla"),plugin:counts("plugin")};
  });
  pair.note = judges.length ? judges.map((judge:any,index:number) => `Review ${index+1}: ` + judge.result.rationale.replace(/(?<![\w-])[AB](?![\w-])/g,(side:"A"|"B")=>judge.mapping[side]==="vanilla"?"the no-plugin result":"the plugin result")).join(" ") : "Complete paired visual evidence or valid blinded reviews were unavailable. This attempt remains in the matrix; no winner is assigned.";
  pairs.push(pair); console.log(`READY ${key}`);
}
if (completedOnly) assertPublishedGallery(pairs);
else assertCompleteGallery(pairs, [...new Set<string>(pairs.map((pair: any) => pair.task))].filter(task => !GALLERY_TASKS.includes(task)));
const data = {...existing, generatedAt:new Date().toISOString(), pairs, framing:"Preview resolution and evidence presentation vary by task; exact dimensions are shown in the viewer.", limitation:"Separate historical cohorts; one paired generation per task/model except the explicitly curated historical lantern. No aggregate capability claim."};
await writeFile(join(publicRoot,prefix,"comparison.json"),JSON.stringify(data,null,2));
console.log(`COMPLETE ${pairs.length} pairs across ${GALLERY_MODELS.length} current models`);
