import {expect,test} from 'bun:test';import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
test('resource continuation preserves preselected completed pairs and failed replacements',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bas-merge-'));
 try{
  const prior=join(root,'prior'),next=join(root,'next'),output=join(root,'merged');await mkdir(prior);await mkdir(next);
  const a={task:'room',model:'model-a'},b={task:'market',model:'model-b'};
  const controls={snapshot:'/frozen',fingerprint:'unchanged',reasoning:'medium',timeoutMinutes:30,codexTransport:'http',repetitions:1};
  const json=async(path:string,value:any)=>writeFile(path,JSON.stringify(value));
  await json(join(prior,'campaign.json'),{...controls,pairs:[a,b],concurrency:4});
  await json(join(prior,'resource-halt.json'),{continuation:next,completedEvaluatedPairs:[a]});
  await json(join(next,'campaign-results.json'),{...controls,pairs:[b],completedAt:'done',resourcePolicy:{concurrency:1,cpuHardCapPercent:20}});
  for(const condition of ['vanilla','plugin']){
   for(const [source,pair,score] of [[prior,a,13],[prior,b,100],[next,b,5]] as const){const dir=join(source,`${pair.task}--${pair.model}--${condition}`);await mkdir(dir);await json(join(dir,source===next&&condition==='plugin'?'run-manifest.json':'summary.json'),{score});}
  }
  const run=async(out:string)=>{const child=Bun.spawn([process.execPath,resolve(import.meta.dir,'../../tools/merge-gallery-campaigns.ts'),'--prior',prior,'--continuation',next,'--output',out],{stdout:'pipe',stderr:'pipe',windowsHide:true});return {exit:await child.exited,error:await new Response(child.stderr).text()};};
  expect((await run(output)).exit).toBe(0);
  expect(JSON.parse(await readFile(join(output,'room--model-a--vanilla/summary.json'),'utf8')).score).toBe(13);
  expect(JSON.parse(await readFile(join(output,'market--model-b--vanilla/summary.json'),'utf8')).score).toBe(5);
  const merged=JSON.parse(await readFile(join(output,'campaign-results.json'),'utf8'));
  expect(merged.results).toHaveLength(4);expect(merged.results.at(-1).summaryPath).toBeNull();
  expect(JSON.parse(await readFile(join(prior,'market--model-b--vanilla/summary.json'),'utf8')).score).toBe(100);
  await json(join(next,'campaign-results.json'),{...controls,pairs:[a,b]});
  expect((await run(join(root,'invalid'))).error).toContain('exactly the pairs unfinished');
 }finally{await rm(root,{recursive:true,force:true});}
});
