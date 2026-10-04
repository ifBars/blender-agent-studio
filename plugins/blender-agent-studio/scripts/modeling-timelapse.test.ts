import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { encoderArgs, readCapture, renderModelingTimelapse } from './modeling-timelapse.ts';
import { runBlender } from './blender-process.ts';
import { renderAuthoredEvidence } from '../skills/blender-agent-benchmark/scripts/run_benchmark.ts';

describe('modeling timelapse', () => {
  test.skipIf(!(process.env.BLENDER_EXECUTABLE || Bun.which('blender')) || !Bun.which('ffmpeg') || !Bun.which('ffprobe'))('renders real build history and authored scene evidence, then probes the MP4', async () => {
    const directory = await mkdtemp(join(tmpdir(),'bas-timelapse-live-'));
    try {
      const buildProcess = await runBlender({scriptPath:join(import.meta.dir,'../skills/blender-rendering-workflow/scripts/fixture_modeling_timelapse.py'),scriptArgs:[directory],timeoutMs:90000});
      if (buildProcess.exitCode !== 0) throw new Error(buildProcess.stdout + buildProcess.stderr);
      expect(buildProcess.exitCode).toBe(0);
      const manifestPath = join(directory,'progress/capture.json');
      const before = await readFile(manifestPath,'utf8');
      const report = await renderModelingTimelapse({manifestPath,outputDir:join(directory,'video'),maxEdge:256,samples:1,timeoutMs:180000});
      expect(report.status).toBe('complete');
      expect(report.checkpoints).toHaveLength(5);
      expect(report.checkpoints[0].objectCount).toBe(3);
      expect(report.checkpoints[4].objectCount).toBeGreaterThan(15);
      expect(report.checkpoints[4].lighting).toBe('authored_final');
      const previewLights = report.checkpoints[0].renderLights;
      const finalLights = report.checkpoints[4].renderLights;
      expect(previewLights).toHaveLength(finalLights.length);
      for (const [index, light] of previewLights.entries()) {
        expect(light.type).toBe(finalLights[index].type);
        light.matrixWorld.flat().forEach((value:number, component:number) =>
          expect(value).toBeCloseTo(finalLights[index].matrixWorld.flat()[component],5));
      }
      const probe = Bun.spawn(['ffprobe','-v','error','-show_entries','format=duration:stream=nb_frames,avg_frame_rate','-of','json',report.videoPath],{stdout:'pipe',stderr:'pipe',windowsHide:true});
      const [text, code] = await Promise.all([new Response(probe.stdout).text(),probe.exited]);
      expect(code).toBe(0);
      const video = JSON.parse(text);
      expect(Number(video.format.duration)).toBeCloseTo(5,1);
      expect(Number(video.streams[0].nb_frames)).toBe(120);
      expect(video.streams[0].avg_frame_rate).toBe('24/1');
      expect(await readFile(manifestPath,'utf8')).toBe(before);
      await expect(renderModelingTimelapse({manifestPath,outputDir:join(directory,'video')})).rejects.toThrow();
      const evidence = await renderAuthoredEvidence({assetPath:join(directory,'asset.blend'),outputDir:join(directory,'evidence'),cameras:['SceneHero','SceneReverse','SceneDetail'],blenderPath:Bun.which('blender') ?? process.env.BLENDER_EXECUTABLE!,preview:true});
      expect(evidence).toEqual({passed:true,missingDependencies:[]});
      const images = JSON.parse(await readFile(join(directory,'evidence/evidence.json'),'utf8'));
      expect(images.scope).toBe('authored_scene_cameras');
      expect(images.views.map((v:any)=>v.camera)).toEqual(['SceneHero','SceneReverse','SceneDetail']);
    } finally { await rm(directory,{recursive:true,force:true}); }
  },300000);
  test('requires chronological complete, unchanged actual snapshots', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bas-capture-'));
    try {
      const payload = Buffer.from('inert fixture');
      const digest = createHash('sha256').update(payload).digest('hex');
      const checkpoints = ['initial','checkpoint','final'].map((kind,i)=>({kind,label:kind,file:`00${i}.blend`,sha256:digest,scene:'Scene',frame:1}));
      await Promise.all(checkpoints.map(entry=>writeFile(join(directory,entry.file),payload)));
      const path = join(directory,'capture.json');
      const capture = {schemaVersion:1,status:'complete',capture:'authored_build_checkpoints',checkpoints};
      const save = () => writeFile(path, JSON.stringify(capture));
      await save();
      expect((await readCapture(path)).checkpoints).toHaveLength(3);
      capture.status='recording'; await save();
      await expect(readCapture(path)).rejects.toThrow('complete capture');
      capture.status='complete'; checkpoints[1].kind='final'; await save();
      await expect(readCapture(path)).rejects.toThrow('order');
      checkpoints[1].kind='checkpoint'; checkpoints[1].file='../outside.blend'; await save();
      await expect(readCapture(path)).rejects.toThrow('Invalid checkpoint');
      checkpoints[1].file='001.blend'; await save();
      await writeFile(join(directory,'001.blend'),'changed');
      await expect(readCapture(path)).rejects.toThrow('Checkpoint changed');
    } finally { await rm(directory,{recursive:true,force:true}); }
  });
  test('bounds encoding and fixes duration and playable H264 format', () => {
    const args = encoderArgs(6, 1, 24);
    expect(args[args.indexOf('-frames:v')+1]).toBe('144');
    expect(args).toContain('yuv420p');
    expect(args).toContain('-n');
    for (const count of [2,65,3.5]) expect(()=>encoderArgs(count,1,24)).toThrow();
    for (const seconds of [0,6,NaN]) expect(()=>encoderArgs(3,seconds,24)).toThrow();
    expect(()=>encoderArgs(3,1,25)).toThrow();
  });
});
