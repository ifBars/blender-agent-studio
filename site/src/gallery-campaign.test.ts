import {expect,test} from 'bun:test';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

test('campaign pauses between complete pairs and resumes without regenerating prior attempts',async()=>{
  const root=await mkdtemp(join(tmpdir(),'bas-campaign-'));
  const children:ReturnType<typeof Bun.spawn>[]=[];
  const spawn=(args:string[],options:any)=>{const child=Bun.spawn(args,{...options,windowsHide:true});children.push(child);return child;};
  try {
    const snapshot=join(root,'snapshot'), output=join(root,'runs'), existing=join(root,'existing.json');
    const scripts=join(snapshot,'skills/blender-agent-benchmark/scripts');
    await mkdir(scripts,{recursive:true});
    // A deterministic fake generator exercises scheduling without invoking agents or Blender.
    await writeFile(join(scripts,'run_benchmark.ts'),`import {existsSync} from 'node:fs';import {mkdir,writeFile} from 'node:fs/promises';import {join,dirname} from 'node:path';const dir=process.argv[process.argv.indexOf('--output')+1],model=process.argv[process.argv.indexOf('--model')+1];await mkdir(dir,{recursive:true});await writeFile(join(dir,'generation.json'),JSON.stringify({startedAt:Date.now()}));if(model==='gpt-6-astra'){const deadline=Date.now()+30000;while(!existsSync(join(dirname(dir),'pause-request.json'))){if(Date.now()>deadline)throw new Error('Pause request missing');await Bun.sleep(25);}}await writeFile(join(dir,'summary.json'),JSON.stringify({meanAutomatedScore:42,hardGatePasses:0}));`);
    await writeFile(existing,JSON.stringify({pairs:['claude-opus-5-5','claude-sonnet-5-5'].map(model=>({task:'signal_lantern',model}))}));
    const runner=resolve(import.meta.dir,'../../tools/run-gallery-matrix.ts');
    const args=['bun',runner,'--output',output,'--skill-root',snapshot,'--existing-data',existing,'--tasks','signal_lantern','--timeout-minutes','1'];
    const start=()=>spawn(args,{stdout:'pipe',stderr:'pipe'});
    const first=start();
    const firstLogs=Promise.all([new Response(first.stdout).text(),new Response(first.stderr).text()]);
    const deadline=Date.now()+25000;
    while(!existsSync(join(output,'signal_lantern--gpt-6-astra--vanilla.process.json'))) {
      if(Date.now()>deadline)throw new Error('Campaign did not start');await Bun.sleep(25);
    }
    const pause=spawn(['bun',runner,'--request-pause','--output',output],{stdout:'ignore',stderr:'pipe'});
    expect(await pause.exited).toBe(0);
    expect(await first.exited).toBe(0);await firstLogs;
    expect(existsSync(join(output,'campaign-results.json'))).toBe(false);
    const progress=JSON.parse(await readFile(join(output,'progress.json'),'utf8'));
    expect(progress).toHaveLength(2);
    expect(progress.every((cell:any)=>cell.model==='gpt-6-astra')).toBe(true);
    const generated=await readFile(join(output,'signal_lantern--gpt-6-astra--vanilla/generation.json'),'utf8');
    const changed=[...args];changed[changed.indexOf('--timeout-minutes')+1]='2';
    const invalid=spawn([...changed,'--resume'],{stdout:'ignore',stderr:'pipe'});
    expect(await invalid.exited).not.toBe(0);
    expect(await new Response(invalid.stderr).text()).toContain('controls differ');
    const revisedGuidance=join(root,'resource-v2.md');await writeFile(revisedGuidance,'Shared GPU denoising preference; both conditions.');
    const unapproved=spawn([...args,'--resume','--guidance-file',revisedGuidance],{stdout:'ignore',stderr:'pipe'});
    expect(await unapproved.exited).not.toBe(0);expect(await new Response(unapproved.stderr).text()).toContain('Resume resource guidance changed');
    const resumed=spawn([...args,'--resume','--guidance-file',revisedGuidance,'--amend-resource-guidance'],{stdout:'pipe',stderr:'pipe'});
    const resumedLogs=Promise.all([new Response(resumed.stdout).text(),new Response(resumed.stderr).text()]);
    expect(await resumed.exited).toBe(0);await resumedLogs;
    expect(JSON.parse(await readFile(join(output,'campaign-results.json'),'utf8')).results).toHaveLength(4);
    const campaign=JSON.parse(await readFile(join(output,'campaign.json'),'utf8'));expect(campaign.resourceAmendments).toHaveLength(1);
    expect(campaign.pairResourcePolicies['signal_lantern--gpt-6-astra'].guidanceHash).not.toBe(campaign.resourcePolicy.guidanceHash);
    expect(await readFile(join(output,'signal_lantern--gpt-6-astra--vanilla/generation.json'),'utf8')).toBe(generated);
  } finally {for(const child of children)if(child.exitCode===null)child.kill();await Promise.allSettled(children.map(child=>child.exited));await rm(root,{recursive:true,force:true});}
},60000);
