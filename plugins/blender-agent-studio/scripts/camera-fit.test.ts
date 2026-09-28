import {expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {runBlender} from './blender-process.ts';
const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which('blender');
const root = resolve(import.meta.dir, '..');
test.skipIf(!blender)('camera framing fits both projections without changing source or geometry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bas-camera-fit-'));
  const client = new Client({name:'camera-fit-test',version:'1'});
  try {
    const fixture = join(dir,'fixture.py');
    await writeFile(fixture, String.raw`
import bpy, json, sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
out=Path(sys.argv[sys.argv.index('--')+1])
scene=bpy.context.scene
cube=bpy.data.objects['Cube']
cam=scene.camera
scene.render.resolution_x=640
scene.render.resolution_y=480
scene.render.resolution_percentage=100
for kind in ('ORTHO','PERSP'):
    cam.data.type=kind
    cam.data.ortho_scale=6
    cam.data.lens=40
    cam.data.shift_x=.05
    cam.data.shift_y=-.04
    bpy.context.view_layer.update()
    landmarks=[]
    for i,xyz in enumerate([[-1,-1,-1],[1,-1,1],[-1,1,1],[1,1,-1]]):
        uv=world_to_camera_view(scene,cam,Vector(xyz))
        landmarks.append(dict(name=str(i),objectName='Cube',localPoint=xyz,referenceUv=[uv.x,1-uv.y]))
    (out/(kind+'.json')).write_text(json.dumps(landmarks))
    cam.data.ortho_scale=8
    cam.data.lens=32
    cam.data.shift_x=-.1
    cam.data.shift_y=.1
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(kind+'.blend')))
`);
    const built=await runBlender({blenderPath:blender!,scriptPath:fixture,scriptArgs:[dir],timeoutMs:10000});
    expect(built.exitCode,built.stdout+built.stderr).toBe(0);
    await client.connect(new StdioClientTransport({command:'bun',args:[join(root,'mcp/server.ts')],cwd:root,stderr:'pipe'}));
    for (const kind of ['ORTHO','PERSP']) {
      const assetPath=join(dir,kind+'.blend');
      const digest=()=>readFile(assetPath).then(b=>createHash('sha256').update(b).digest('hex'));
      const before=await digest();
      const landmarks=JSON.parse(await readFile(join(dir,kind+'.json'),'utf8'));
      const args={assetPath,outputDir:join(dir,kind),referenceWidth:640,referenceHeight:480,landmarks,blenderPath:blender,timeoutMs:10000};
      const response=await client.callTool({name:'blender_fit_reference_camera',arguments:args});
      expect(response.isError,JSON.stringify(response.content)).not.toBe(true);
      const report=(response.structuredContent as any).report;
      expect(report.rms_before_px).toBeGreaterThan(50);
      expect(report.rms_after_px).toBeLessThan(.01);
      expect(await digest()).toBe(before);
      const verify=join(dir,'verify.py');
      await writeFile(verify,`import bpy\nbpy.ops.wm.open_mainfile(filepath=${JSON.stringify(report.candidate)})\nassert len(bpy.data.objects['Cube'].data.vertices)==8\nassert tuple(bpy.data.objects['Cube'].scale)==(1,1,1)\nassert bpy.data.objects['Camera'].data.shift_x < 0\nassert bpy.context.scene.camera.name==${JSON.stringify(report.fitted_camera)}\n`);
      const checked=await runBlender({blenderPath:blender!,scriptPath:verify,timeoutMs:10000});
      expect(checked.exitCode,checked.stdout+checked.stderr).toBe(0);
      const occupied=await client.callTool({name:'blender_fit_reference_camera',arguments:args});
      expect(occupied.isError).toBe(true);
      const unconstrained=await client.callTool({name:'blender_fit_reference_camera',arguments:{...args,outputDir:join(dir,kind+'-bad'),landmarks:[landmarks[0],landmarks[0],landmarks[0]]}});
      expect(unconstrained.isError).toBe(true);
    }
  } finally {await client.close();await rm(dir,{recursive:true,force:true});}
},30000);
