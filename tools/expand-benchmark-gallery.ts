import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { sha256, provenanceMismatches } from '../plugins/blender-agent-studio/skills/blender-agent-benchmark/scripts/provenance';
import { assertVanillaPluginConditions } from './comparison-contract';

const arg = (key: string) => { const i = process.argv.indexOf(key); if(i < 0 || !process.argv[i+1]) throw new Error(`Missing ${key}`); return resolve(process.argv[i+1]); };
const spatialData = arg('--spatial-data'), legacy = arg('--legacy-root'), vanillaRuns = arg('--vanilla-runs'), pluginRuns = arg('--plugin-runs'), output = arg('--output'), blender = arg('--blender');
const read = async (p: string) => JSON.parse(await readFile(p,'utf8'));
const original = await read(spatialData);
if(original.experiment !== 'vanilla_vs_plugin' || original.pairs.length !== 8) throw new Error('Expected the frozen eight-pair spatial gallery');
const pairs: any[] = [], jobs: any[] = [];
const prefix = 'benchmarks/gallery-v2';
const publicRoot = resolve(import.meta.dir, '../site/public');
await mkdir(output,{recursive:true});
const stagingNames = new Set(['Studio ground','Studio | ground','Studio | desk plane','Studio | compact curved backdrop','Preview floor']);

async function addJobs(pair: any, summaries: any[], results: any[], evidenceDirs: string[]) {
  assertVanillaPluginConditions(summaries[0],summaries[1]);
  const mismatches = provenanceMismatches(summaries[0],summaries[1],[results[0].taskId]);
  if(mismatches.length) throw new Error(mismatches.join('; '));
  for(const [i,condition] of ['vanilla','plugin'].entries()) {
    const r = results[i], s = summaries[i], native = join(r.workdir,'asset.blend');
    for(const [file,hash] of Object.entries(r.artifactHashes ?? {})) if(sha256(await readFile(join(r.workdir,file))) !== hash) throw new Error(`Changed artifact: ${pair.id}/${file}`);
    const metrics = await read(join(r.workdir,'metrics-blend.json'));
    const hidden = metrics.objects.filter((o:any)=>o.type==='MESH' && stagingNames.has(o.name)).map((o:any)=>o.name);
    const views = Object.keys(pair[condition].images);
    const renderDir = join(output,'renders',pair.id,condition);
    jobs.push({id:pair.id,condition,native,sourceHash:sha256(await readFile(native)),hidden,views,renderDir,evidenceDir:evidenceDirs[i]});
    pair[condition].preview = {preset:'gallery-cycles-v1',resolution:1536,engine:'CYCLES',samples:64,denoiser:'OPENIMAGEDENOISE',hiddenStagingObjects:hidden,sourceSha256:sha256(await readFile(native)),sourceModified:false};
  }
  pairs.push(pair);
}
for(const entry of original.pairs) {
  const pair = structuredClone(entry);
  pair.id = `${pair.task}--${pair.model}--r01`; pair.repetition=1; pair.cohort='October 2026 spatial pilot';
  pair.limitation=original.limitation; pair.judgeCount=2;
  const roots=[join(vanillaRuns,`${pair.task}--${pair.model}--vanilla`),join(pluginRuns,`${pair.task}--${pair.model}--current`)];
  const summaries=await Promise.all(roots.map(p=>read(join(p,'summary.json'))));
  await addJobs(pair,summaries,summaries.map(s=>s.results[0]),summaries.map(s=>dirname(s.results[0].evidenceContactSheet)));
}
const legacySpecs = [
  ['sol-smoke-baseline-v2','sol-smoke-skills','sol-smoke-comparison-v2',1],
  ['sol-lantern-repeats-baseline-review','sol-lantern-repeats-skills','sol-lantern-repeats-comparison',2],
  ['astra-press-baseline-review','astra-press-skills','astra-press-visual-floor-hidden',1],
  ['astra-drawbridge-baseline-review','astra-drawbridge-skills','astra-drawbridge-visual-floor-hidden',1],
] as const;
for(const [a,b,reviewDir,offset] of legacySpecs) {
  const summaries=await Promise.all([a,b].map(d=>read(join(legacy,d,'summary.json'))));
  const review=await read(join(legacy,reviewDir,'comparison-summary.json'));
  if(review.regressionGate.configurationMismatches.length) throw new Error('Legacy controls differ');
  for(const comparison of review.comparisons) {
    const results=summaries.map(s=>s.results.find((r:any)=>r.taskId===comparison.taskId && r.repetition===comparison.repetition));
    if(results.some(r=>!r))throw new Error('Legacy result missing');
    const rep=offset+comparison.repetition-1, model=summaries[0].model;
    const pair:any={id:`${comparison.taskId}--${model}--r${String(rep).padStart(2,'0')}`,task:comparison.taskId,taskTitle:results[0].taskTitle,model,modelTitle:model==='gpt-6-sol'?'GPT 6 Sol':'GPT 6 Astra',repetition:rep,cohort:'September 2026 quality study',judgeCount:3,
      limitation:'Historical skill-workflow comparison, with the original model and evaluator. Three reviews of each pair. Scores are kept separate from the October pilot. Some judged views hide oversized studio floors; original delivery failures are retained.',
      votes:{baseline:comparison.visualWinnerVotes.filter((v:string)=>v===review.baselineMode).length,candidate:comparison.visualWinnerVotes.filter((v:string)=>v===review.candidateMode).length,tie:comparison.visualWinnerVotes.filter((v:string)=>v==='tie').length},rawReview:comparison};
    for(const [i,key] of ['vanilla','plugin'].entries()) {
      const r=results[i],s=summaries[i],m=await read(join(r.workdir,'metrics-blend.json'));
      pair[key]={score:r.score.score,rawScore:r.score.score,hardGate:r.score.hardGatePass,rawHardGate:r.score.hardGatePass,seconds:Math.round(r.agent.durationMs/1000),triangles:m.totals.triangles,
        images:Object.fromEntries(['perspective','front','back','left','right','top'].map(v=>[v,v])),failedChecks:r.score.checks.filter((c:any)=>!c.passed),
        executionMode:s.executionMode,guidanceHash:s.guidanceHash??null,skillFingerprint:s.skillFingerprint??null,agentVersion:s.codexVersion,
        evaluatorFingerprint:s.evaluatorFingerprint,generationTaskFingerprint:s.taskFingerprints[r.taskId],rawScorerVersion:s.scorerVersion,modelRequested:model,
        sourceHashesRecordedAtGalleryBuild:true,artifactHashes:{'asset.blend':sha256(await readFile(join(r.workdir,'asset.blend'))),'asset.glb':sha256(await readFile(join(r.workdir,'asset.glb')))}};
    }
    const modes=[review.baselineMode,review.candidateMode];
    pair.criteria=comparison.judgeResults[0].result.criterionResults.map((c:any)=>{
      const counts=(mode:string)=>{const n={pass:0,fail:0,unclear:0};for(const judge of comparison.judgeResults){const side=judge.mapping.A===mode?'A':'B'; const answer=judge.result.criterionResults.find((x:any)=>x.criterionId===c.criterionId)?.[side] as keyof typeof n;n[answer in n?answer:'unclear']++;}return n;};
      return {id:c.criterionId,label:c.criterionId.replaceAll('_',' '),vanilla:counts(modes[0]),plugin:counts(modes[1])};
    });
    const first=comparison.judgeResults[0];
    pair.note=first.result.rationale.replace(/\b[AB]\b/g,(side:'A'|'B')=>first.mapping[side]===modes[0]?'the no-plugin result':'the plugin result').replace(/(^|[.!?]\s+)the /g,'$1The ');
    await addJobs(pair,summaries,results,results.map(r=>dirname(r.evidenceContactSheet)));
  }
}
for (const pair of pairs) if (pair.task === 'winch_drawbridge')
  pair.limitation += ' This gallery shows still views; the historical drawbridge review also used sampled animation frames.';
// Show the earlier lantern first, including its counterexample repeat.
pairs.sort((a,b)=>Number(b.task==='signal_lantern')-Number(a.task==='signal_lantern'));
await writeFile(join(output,'render-plan.json'),JSON.stringify(jobs,null,2));
for(const [index,job] of jobs.entries()) {
  const manifest=join(job.renderDir,'preview.json');
  if(!existsSync(manifest)) {
    if(existsSync(job.renderDir)) throw new Error(`Incomplete preview: ${job.renderDir}; inspect before retrying`);
    await mkdir(dirname(job.renderDir),{recursive:true});
    console.log(`RENDER ${index+1}/${jobs.length} ${job.id}/${job.condition}`);
    const command=[blender,'--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',resolve(import.meta.dir,'render-gallery-preview.py'),'--','--input',job.native,'--output',job.renderDir,'--views',job.views.join(','),'--hide-objects-json',JSON.stringify(job.hidden)];
    const child=Bun.spawn(command,{stdout:Bun.file(join(output,`${job.id}-${job.condition}.log`)),stderr:'pipe',windowsHide:true});
    const timer=setTimeout(()=>{Bun.spawn(['taskkill','/PID',String(child.pid),'/T','/F'],{stdout:'ignore',stderr:'ignore',windowsHide:true});},600_000);
    const [code,stderr]=await Promise.all([child.exited,new Response(child.stderr).text()]);clearTimeout(timer);
    if(code!==0)throw new Error(`Render failed ${job.id}/${job.condition}: ${stderr}`);
  }
  const m=await read(manifest);
  if(m.sourceSha256!==job.sourceHash || sha256(await readFile(job.native))!==job.sourceHash || m.preset!=='gallery-cycles-v1' || JSON.stringify(m.views)!==JSON.stringify(job.views) || JSON.stringify(m.hiddenStagingObjects)!==JSON.stringify(job.hidden))throw new Error('Preview provenance differs');
  const pair=pairs.find(p=>p.id===job.id), condition=pair[job.condition];
  condition.images={};condition.imageHashes={};condition.originalImages={};condition.originalImageHashes={};
  for(const view of job.views)for(const kind of ['hd','original']) {
    const path=`${prefix}/${job.id}/${job.condition}/${kind}/${view}.png`;
    const source=join(kind==='hd'?job.renderDir:job.evidenceDir,`${view}.png`);
    const bytes=await readFile(source); const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    if(kind==='hd' && (width!==1536 || height!==1536))throw new Error('Preview resolution mismatch');
    await mkdir(dirname(join(publicRoot,path)),{recursive:true});await copyFile(source,join(publicRoot,path));
    condition[kind==='hd'?'images':'originalImages'][view]=path;
    condition[kind==='hd'?'imageHashes':'originalImageHashes'][view]=sha256(bytes);
  }
  console.log(`READY ${index+1}/${jobs.length}`);
}
const data={schemaVersion:2,experiment:'vanilla_vs_plugin',generatedAt:new Date().toISOString(),pairs,
 framing:'HD previews · 1536 px · denoised',limitation:'Saved assets re-rendered for display. Original renders, scores and reviews remain available. Results come from separate historical cohorts.',
 previewPolicy:'HD uses Cycles, 64 samples and OpenImageDenoise. Explicit studio meshes are hidden for framing; model geometry is unchanged. Reviews refer to original evidence, not these new renders.'};
await writeFile(join(publicRoot,prefix,'comparison.json'),JSON.stringify(data,null,2));
console.log(`COMPLETE ${pairs.length} pairs`);
