import {existsSync} from 'node:fs';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const arg=(name:string)=>{const index=process.argv.indexOf(name);if(index<0||!process.argv[index+1])throw new Error(`Missing ${name}`);return resolve(process.argv[index+1]);};
const prior=arg('--prior'),continuation=arg('--continuation'),output=arg('--output');
const read=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
if(existsSync(output))throw new Error('Choose a fresh merged output; preserve all original attempts');
const old=await read(join(prior,'campaign.json')),next=await read(join(continuation,'campaign-results.json')),halt=await read(join(prior,'resource-halt.json'));
if(resolve(halt.continuation)!==continuation)throw new Error('Continuation was not recorded at the resource halt');
for(const field of ['snapshot','fingerprint','reasoning','timeoutMinutes','codexTransport','repetitions'])
 if(old[field]!==next[field])throw new Error(`Continuation changes ${field}`);
const key=(p:any)=>`${p.task}--${p.model}`;
const kept=new Set(halt.completedEvaluatedPairs.map(key)),replacement=new Set(next.pairs.map(key));
if(old.pairs.some((p:any)=>kept.has(key(p))===replacement.has(key(p)))||kept.size+replacement.size!==old.pairs.length)
 throw new Error('Continuation must replace exactly the pairs unfinished at the recorded halt');
await mkdir(output,{recursive:true});
const results=[],policies:any={},sources:any={};
for(const pair of old.pairs){
 const id=key(pair),source=kept.has(id)?prior:continuation;
 policies[id]=kept.has(id)?{concurrency:old.concurrency,cpuHardCapPercent:null}:next.pairResourcePolicies?.[id]??next.resourcePolicy;sources[id]=source;
 for(const condition of ['vanilla','plugin']){
  const cell=`${id}--${condition}`,dir=join(output,cell);await mkdir(dir);
  const summary=join(source,cell,'summary.json');
  if(kept.has(id)&&!existsSync(summary))throw new Error('Previously completed evidence is missing');
  for(const file of ['summary.json','run-manifest.json'])if(existsSync(join(source,cell,file)))await copyFile(join(source,cell,file),join(dir,file));
  const processFile=join(source,`${cell}.process.json`);
  const process=existsSync(processFile)?await read(processFile):null;
  results.push({...pair,condition,sourceCampaign:source,summaryPath:existsSync(summary)?summary:null,exitCode:process?.exitCode??null});
 }
}
const manifest={...old,mergedAt:new Date().toISOString(),sourceCampaigns:[prior,continuation],pairSourceCampaigns:sources,pairResourcePolicies:policies,
 resourceHalt:halt,concurrency:1,resourcePolicy:next.resourcePolicy};
await writeFile(join(output,'campaign.json'),JSON.stringify(manifest,null,2));
await writeFile(join(output,'campaign-results.json'),JSON.stringify({...manifest,completedAt:next.completedAt,results},null,2));
console.log(`Merged ${old.pairs.length} preselected pairs; original files and paths remain unchanged.`);
