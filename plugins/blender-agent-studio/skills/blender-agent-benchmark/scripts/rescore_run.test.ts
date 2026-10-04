import {expect, test} from 'bun:test';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256} from './provenance';

test('rescoring preserves raw evidence and rejects overwrites or modified artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bas-rescore-'));
  try {
    const artifact = join(root,'asset.blend'), summary = join(root,'summary.json'), output = join(root,'rescored.json');
    await writeFile(artifact,'unchanged native evidence');
    const raw = {scorerVersion:7, results:[{taskId:'signal_lantern',workdir:root,agent:{exitCode:0},score:{score:42,hardGatePass:false},artifactHashes:{'asset.blend':sha256('unchanged native evidence')}}]};
    const original = JSON.stringify(raw); await writeFile(summary,original);
    const run = async (destination:string) => {
      const child = Bun.spawn(['bun',join(import.meta.dir,'rescore_run.ts'),'--summary',summary,'--output',destination],{stdout:'pipe',stderr:'pipe',windowsHide:true});
      const [exitCode,stderr] = await Promise.all([child.exited,new Response(child.stderr).text()]);
      return {exitCode,stderr};
    };
    expect((await run(output)).exitCode).toBe(0);
    const rescored = JSON.parse(await readFile(output,'utf8'));
    expect(rescored.results[0].rawScore).toEqual(raw.results[0].score);
    expect(rescored.results[0].artifactHashes).toEqual(raw.results[0].artifactHashes);
    expect(rescored.scorerVersion).toBe(9);
    expect(rescored.rawScorerVersion).toBe(7);
    expect(rescored.rescoreEvaluatorFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await readFile(summary,'utf8')).toBe(original);
    expect((await run(summary)).stderr).toContain('fresh rescore output');
    const saved = await readFile(output,'utf8');
    expect((await run(output)).exitCode).not.toBe(0);
    expect(await readFile(output,'utf8')).toBe(saved);
    await writeFile(artifact,'changed evidence');
    const changed = await run(join(root,'modified.json'));
    expect(changed.exitCode).not.toBe(0);
    expect(changed.stderr).toContain('Artifact changed since generation');
    expect(await Bun.file(join(root,'modified.json')).exists()).toBe(false);
  } finally { await rm(root,{recursive:true,force:true}); }
},10000);
