import {expect,test} from 'bun:test';import {mkdtemp,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {verifyAuthoredEvidence} from './evidence-provenance';import {sha256} from './provenance';
test('replacement evaluator images must match saved source, camera coverage and dependency preflight',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bas-evidence-proof-'));
 try{
  const native=join(dir,'asset.blend'),image=join(dir,'hero.png');await writeFile(native,'saved unchanged scene');await writeFile(image,'rendered image');
  const report={status:'complete',sourceSha256:sha256('saved unchanged scene'),renders:[{camera:'Hero',path:image}],preflight:{missingDependencies:[]}};
  const save=async(value:any)=>writeFile(join(dir,'render-manifest.json'),JSON.stringify(value));
  await save(report);expect((await verifyAuthoredEvidence(dir,native,['Hero'])).passed).toBe(true);
  await expect(verifyAuthoredEvidence(dir,native,['Hero','Reverse'])).rejects.toThrow('every required');
  await save({...report,renders:[{camera:'Other',path:image}]});await expect(verifyAuthoredEvidence(dir,native,['Hero'])).rejects.toThrow('every required');
  await save({...report,sourceSha256:'incorrect'});await expect(verifyAuthoredEvidence(dir,native,['Hero'])).rejects.toThrow('source hash');
  await save({...report,preflight:{missingDependencies:['missing wood texture']}});expect((await verifyAuthoredEvidence(dir,native,['Hero'])).passed).toBe(false);
  await save({...report,preflight:{}});await expect(verifyAuthoredEvidence(dir,native,['Hero'])).rejects.toThrow('preflight');
 }finally{await rm(dir,{recursive:true,force:true});}
});
