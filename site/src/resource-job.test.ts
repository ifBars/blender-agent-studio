import {expect,test} from 'bun:test';
import {cpus} from 'node:os';
import {resolve} from 'node:path';

test.skipIf(process.platform !== 'win32')('Windows job caps busy descendants and passes the resource policy',async()=>{
  const worker=`const start=process.cpuUsage(),end=Date.now()+3000;while(Date.now()<end){Math.sqrt(Math.random());}const cpu=process.cpuUsage(start);console.log(JSON.stringify({seconds:(cpu.user+cpu.system)/1e6,policy:process.env.BAS_RESOURCE_JOB,threads:process.env.OMP_NUM_THREADS}));`;
  const code=`const start=Date.now();const children=Array.from({length:4},()=>Bun.spawn([process.execPath,'-e',${JSON.stringify(worker)}],{stdout:'pipe',stderr:'pipe',windowsHide:true}));const rows=await Promise.all(children.map(async p=>{const out=await new Response(p.stdout).text();if(await p.exited!==0)throw new Error('Worker failed');return JSON.parse(out);}));console.log(JSON.stringify({elapsed:(Date.now()-start)/1000,rows}));`;
  const configuration=Buffer.from(JSON.stringify({command:[process.execPath,'-e',code],cpuPercent:20})).toString('base64');
  const child=Bun.spawn(['powershell','-NoProfile','-File',resolve(import.meta.dir,'../../tools/windows-resource-job.ps1'),'-ConfigurationBase64',configuration],{stdout:'pipe',stderr:'pipe',windowsHide:true});
  const [stdout,stderr,exit]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  expect(stderr).toBe('');expect(exit).toBe(0);expect(stdout).toContain('cpuHardCap=20% priority=BelowNormal');
  const result=JSON.parse(stdout.trim().split(/\r?\n/).at(-1)!);
  expect(result.rows).toHaveLength(4);
  expect(result.rows.every((r:any)=>r.policy==='windows-cpu-hard-cap-v1'&&r.threads==='2')).toBe(true);
  // Allow accounting/scheduling granularity around the enforced 20% budget.
  expect(100*result.rows.reduce((n:number,r:any)=>n+r.seconds,0)/result.elapsed/cpus().length).toBeLessThan(27);
},15000);
