import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {sha256} from './provenance';

export async function verifyAuthoredEvidence(directory:string,asset:string,cameras:string[]) {
  const report=JSON.parse(await readFile(join(directory,'render-manifest.json'),'utf8'));
  const hash=sha256(await readFile(asset));
  if(report.sourceSha256!==hash)throw new Error('Evidence source hash differs from the saved asset');
  if(report.status!=='complete'||report.renders?.length!==cameras.length||
    new Set(report.renders.map((r:any)=>r.camera)).size!==cameras.length||
    !cameras.every(camera=>report.renders.some((r:any)=>r.camera===camera&&existsSync(r.path))))
    throw new Error('Evidence does not contain every required authored camera');
  const dependencies=report.preflight?.missingDependencies;
  if(!Array.isArray(dependencies))throw new Error('Evidence dependency preflight is missing');
  return {passed:dependencies.length===0,missingDependencies:dependencies,sourceSha256:hash};
}
