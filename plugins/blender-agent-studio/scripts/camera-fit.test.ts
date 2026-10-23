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
// Forward the environment so a process-local resource policy also reaches the server's Blender runs.
const serverTransport = () => new StdioClientTransport({command:'bun',args:[join(root,'mcp/server.ts')],cwd:root,stderr:'pipe',env:{...process.env} as Record<string,string>});
const distance = (a:number[], b:number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
const sha256 = (path:string) => readFile(path).then(b=>createHash('sha256').update(b).digest('hex'));
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
def marks(points, prefix):
    result=[]
    for i,xyz in enumerate(points):
        uv=world_to_camera_view(scene,cam,Vector(xyz))
        result.append(dict(name=prefix+str(i),objectName='Cube',localPoint=xyz,referenceUv=[uv.x,1-uv.y]))
    return result
for kind in ('ORTHO','PERSP'):
    cam.data.type=kind
    cam.data.ortho_scale=6
    cam.data.lens=40
    cam.data.shift_x=.05
    cam.data.shift_y=-.04
    bpy.context.view_layer.update()
    axis=[list(cam.matrix_world @ Vector((0,0,-d))) for d in (9,10.5,12)]
    data=dict(train=marks([[-1,-1,-1],[1,-1,1],[-1,1,1],[1,1,-1]],'t'),heldout=marks([[1,1,1],[-1,-1,1]],'h'),axis=marks(axis,'a'))
    (out/(kind+'.json')).write_text(json.dumps(data))
    cam.data.ortho_scale=8
    cam.data.lens=32
    cam.data.shift_x=-.1
    cam.data.shift_y=.1
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(kind+'.blend')))
`);
    const built=await runBlender({blenderPath:blender!,scriptPath:fixture,scriptArgs:[dir],timeoutMs:10000});
    expect(built.exitCode,built.stdout+built.stderr).toBe(0);
    await client.connect(serverTransport());
    for (const kind of ['ORTHO','PERSP']) {
      const assetPath=join(dir,kind+'.blend');
      const before=await sha256(assetPath);
      const {train:landmarks,heldout,axis}=JSON.parse(await readFile(join(dir,kind+'.json'),'utf8'));
      const args={assetPath,outputDir:join(dir,kind),referenceWidth:640,referenceHeight:480,landmarks,heldoutLandmarks:heldout,blenderPath:blender,timeoutMs:10000};
      const response=await client.callTool({name:'blender_fit_reference_camera',arguments:args});
      expect(response.isError,JSON.stringify(response.content)).not.toBe(true);
      const report=(response.structuredContent as any).report;
      expect(report.mode).toBe('framing');
      expect(report.camera_pose_changed).toBe(false);
      expect(report.rms_before_px).toBeGreaterThan(50);
      expect(report.rms_after_px).toBeLessThan(.01);
      expect(report.heldout_rms_before_px).toBeGreaterThan(50);
      expect(report.heldout_rms_after_px).toBeLessThan(.01);
      expect(report.landmarks.map((l:any)=>l.name)).toEqual(['t0','t1','t2','t3']);
      expect(report.heldout_landmarks.map((l:any)=>l.name)).toEqual(['h0','h1']);
      // Exact correspondences are retained for audit, alongside the original per-point fields.
      for (const [entries,supplied] of [[report.landmarks,landmarks],[report.heldout_landmarks,heldout]] as const)
        entries.forEach((entry:any,i:number)=>{
          expect(entry).toMatchObject({objectName:'Cube',localPoint:supplied[i].localPoint,referenceUv:supplied[i].referenceUv});
          expect(distance(entry.world_point,supplied[i].localPoint)).toBeLessThan(1e-6);
          expect(Math.hypot(...entry.delta_after_px)).toBeCloseTo(entry.error_after_px,9);
        });
      expect(report.correspondence_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(report.source_sha256).toBe(before);
      expect(await sha256(assetPath)).toBe(before);
      const verify=join(dir,'verify.py');
      await writeFile(verify,`import bpy\nbpy.ops.wm.open_mainfile(filepath=${JSON.stringify(report.candidate)})\nassert len(bpy.data.objects['Cube'].data.vertices)==8\nassert tuple(bpy.data.objects['Cube'].scale)==(1,1,1)\nassert bpy.data.objects['Camera'].data.shift_x < 0\nassert bpy.context.scene.camera.name==${JSON.stringify(report.fitted_camera)}\n`);
      const checked=await runBlender({blenderPath:blender!,scriptPath:verify,timeoutMs:10000});
      expect(checked.exitCode,checked.stdout+checked.stderr).toBe(0);
      const occupied=await client.callTool({name:'blender_fit_reference_camera',arguments:args});
      expect(occupied.isError).toBe(true);
      // Distinct points on the optical axis leave focal length/ortho scale unconstrained.
      const unconstrained:any=await client.callTool({name:'blender_fit_reference_camera',arguments:{...args,outputDir:join(dir,kind+'-bad'),heldoutLandmarks:undefined,landmarks:axis}});
      expect(unconstrained.isError).toBe(true);
      expect(JSON.stringify(unconstrained.content)).toMatch(/do not constrain framing/);
      // Repeating a landmark adds weight, not constraint.
      const repeated:any=await client.callTool({name:'blender_fit_reference_camera',arguments:{...args,outputDir:join(dir,kind+'-repeat'),heldoutLandmarks:undefined,landmarks:[...landmarks,{...landmarks[0],name:'again'}]}});
      expect(repeated.isError).toBe(true);
      expect(JSON.stringify(repeated.content)).toMatch(/must be unique/);
    }
  } finally {await client.close();await rm(dir,{recursive:true,force:true});}
},60000);

const quaternionAngleDeg = (a:number[], b:number[]) =>
  2 * Math.acos(Math.min(1, Math.abs(a.reduce((sum, v, i) => sum + v * b[i]!, 0)))) * 180 / Math.PI;

test.skipIf(!blender)('camera pose mode recovers a known camera, keeps held-out landmarks independent and rejects degenerate input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bas-camera-pose-'));
  const client = new Client({name:'camera-pose-test',version:'1'});
  try {
    const fixture = join(dir,'fixture.py');
    // Ground-truth cameras project known points; saved cameras are perturbed copies in their local frame.
    await writeFile(fixture, String.raw`
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector, Euler, Matrix
from bpy_extras.object_utils import world_to_camera_view
out=Path(sys.argv[sys.argv.index('--')+1])
scene=bpy.context.scene
cam=scene.camera
scene.render.resolution_x=640
scene.render.resolution_y=480
scene.render.resolution_percentage=100
train=[[-1,-1,-1],[1,-1,1],[-1,1,1],[1,1,-1],[1,1,1],[-1,-1,1],[0,0,1.6],[1.5,0,0]]
heldout=[[1,-1,-1],[-1,1,-1],[0,-1.4,0],[0,0,-1.5]]
def marks(points, prefix):
    bpy.context.view_layer.update()
    result=[]
    for i,xyz in enumerate(points):
        uv=world_to_camera_view(scene,cam,Vector(xyz))
        assert 0<uv.x<1 and 0<uv.y<1 and uv.z>0, (prefix,i,uv)
        result.append(dict(name=prefix+str(i),objectName='Cube',localPoint=xyz,referenceUv=[uv.x,1-uv.y]))
    return result
def perturb(truth, offset, degrees):
    return truth @ Matrix.Translation(Vector(offset)) @ Euler([math.radians(v) for v in degrees]).to_matrix().to_4x4()
def save(name, matrix):
    cam.matrix_world=matrix
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'.blend')))
data={}
cam.data.type='PERSP'
cam.data.lens=50
cam.data.shift_x=.03
cam.data.shift_y=-.02
truth=cam.matrix_world.copy()
data['persp']=dict(train=marks(train,'t'),heldout=marks(heldout,'h'),location=list(truth.to_translation()),quaternion=list(truth.to_quaternion()))
save('persp-truth',truth)
save('persp-perturbed',perturb(truth,(.35,-.25,.4),(3,-4,2.5)))
save('persp-far',perturb(truth,(0,0,0),(0,25,0)))
cam.data.type='ORTHO'
cam.data.ortho_scale=8
cam.matrix_world=truth
data['ortho']=dict(train=marks(train,'t'),heldout=marks(heldout,'h'),location=list(truth.to_translation()),quaternion=list(truth.to_quaternion()))
save('ortho-perturbed',perturb(truth,(.3,-.2,0),(2,-3,4)))
# Fronto-parallel planar points in ortho: tilting the camera is first-order identical to translating it.
cam.matrix_world=Matrix.LocRotScale(Vector((0,-10,0)),Euler((math.pi/2,0,0)),None)
data['planar']=dict(train=marks([[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,.5]],'p'))
save('ortho-planar',cam.matrix_world.copy())
(out/'truth.json').write_text(json.dumps(data))
`);
    const built=await runBlender({blenderPath:blender!,scriptPath:fixture,scriptArgs:[dir],timeoutMs:20000});
    expect(built.exitCode,built.stdout+built.stderr).toBe(0);
    const truth=JSON.parse(await readFile(join(dir,'truth.json'),'utf8'));
    await client.connect(serverTransport());
    const fit=(name:string, outputDir:string, extra:Record<string,unknown>) => client.callTool({name:'blender_fit_reference_camera',arguments:{
      assetPath:join(dir,name+'.blend'),outputDir:join(dir,outputDir),referenceWidth:640,referenceHeight:480,mode:'pose',blenderPath:blender,timeoutMs:20000,...extra}});
    const reportOf=(response:any)=>{expect(response.isError,JSON.stringify(response.content)).not.toBe(true);return response.structuredContent.report;};

    // Known-camera recovery from a perturbed perspective camera, with fixed intrinsics.
    const sourcePath=join(dir,'persp-perturbed.blend');
    const sourceHash=await sha256(sourcePath);
    const recovered=reportOf(await fit('persp-perturbed','persp-recovered',{landmarks:truth.persp.train,heldoutLandmarks:truth.persp.heldout}));
    expect(recovered.scope).toBe('fixed_intrinsics_reference_pose_fit');
    expect(recovered.degrees_of_freedom).toBe(6);
    expect(recovered.intrinsics_changed).toBe(false);
    expect(recovered.camera_pose_changed).toBe(true);
    expect(recovered.rms_before_px).toBeGreaterThan(20);
    expect(recovered.rms_after_px).toBeLessThan(.01);
    expect(recovered.heldout_rms_before_px).toBeGreaterThan(20);
    expect(recovered.heldout_rms_after_px).toBeLessThan(.01);
    expect(distance(recovered.pose.location_after,truth.persp.location)).toBeLessThan(1e-3);
    expect(quaternionAngleDeg(recovered.pose.rotation_quaternion_after,truth.persp.quaternion)).toBeLessThan(.01);
    expect(recovered.pose.at_rotation_bound).toBe(false);
    expect(recovered.pose.condition_number).toBeLessThan(recovered.pose.condition_limit);
    expect(recovered.parameters).toMatchObject({lens:50});
    expect(recovered.warnings.join(' ')).not.toMatch(/heldout|bound_limited/);
    expect(recovered.source_sha256).toBe(sourceHash);
    expect(await sha256(sourcePath)).toBe(sourceHash);
    const verify=join(dir,'verify.py');
    await writeFile(verify,`import bpy\nfrom mathutils import Vector\nbefore=bpy.data.objects['Camera'].matrix_world.copy()\nbpy.ops.wm.open_mainfile(filepath=${JSON.stringify(recovered.candidate)})\nobjects=bpy.data.objects\nassert len(objects['Cube'].data.vertices)==8\nassert (objects['Camera'].matrix_world.to_translation()-Vector(${JSON.stringify(recovered.pose.location_before)})).length<1e-5\nfit=bpy.context.scene.camera\nassert fit.name==${JSON.stringify(recovered.fitted_camera)}\nassert (fit.matrix_world.to_translation()-Vector(${JSON.stringify(truth.persp.location)})).length<1e-3\nassert abs(fit.data.lens-50)<1e-6 and abs(fit.data.shift_x-.03)<1e-6\n`);
    const checked=await runBlender({blenderPath:blender!,scriptPath:verify,timeoutMs:10000});
    expect(checked.exitCode,checked.stdout+checked.stderr).toBe(0);

    // Held-out landmarks never steer the solve: corrupt two training correspondences from the true camera.
    const corrupted=truth.persp.train.map((mark:any,i:number)=>i<2?{...mark,referenceUv:[mark.referenceUv[0]+.06,mark.referenceUv[1]-.05]}:mark);
    const withHeldout=reportOf(await fit('persp-truth','persp-corrupt-heldout',{landmarks:corrupted,heldoutLandmarks:truth.persp.heldout}));
    const withoutHeldout=reportOf(await fit('persp-truth','persp-corrupt-train-only',{landmarks:corrupted}));
    expect(withHeldout.pose.location_after).toEqual(withoutHeldout.pose.location_after);
    expect(withHeldout.pose.rotation_quaternion_after).toEqual(withoutHeldout.pose.rotation_quaternion_after);
    expect(withHeldout.rms_after_px).toBeLessThan(withHeldout.rms_before_px);
    expect(withHeldout.rms_after_px).toBeGreaterThan(5);
    expect(withHeldout.heldout_rms_before_px).toBeLessThan(.01);
    expect(withHeldout.heldout_rms_after_px).toBeGreaterThan(1);
    expect(withHeldout.warnings.join(' ')).toContain('heldout_regressed');
    expect(withoutHeldout.heldout_rms_after_px).toBeNull();
    expect(withoutHeldout.warnings.join(' ')).toContain('heldout_missing');
    expect(withHeldout.landmarks[0].referenceUv).toEqual(corrupted[0].referenceUv);
    expect(withHeldout.correspondence_sha256).not.toBe(withoutHeldout.correspondence_sha256);
    expect(withHeldout.correspondence_sha256).not.toBe(recovered.correspondence_sha256);

    // Starting at the true camera, a fit must not worsen Blender-measured error.
    const exact=reportOf(await fit('persp-truth','persp-exact',{landmarks:truth.persp.train,heldoutLandmarks:truth.persp.heldout}));
    expect(exact.rms_before_px).toBeLessThan(.01);
    expect(exact.rms_after_px).toBeLessThanOrEqual(exact.rms_before_px);
    expect(exact.heldout_rms_after_px).toBeLessThan(.01);
    expect(exact.pose.rotation_change_deg).toBeLessThan(.001);
    expect(distance(exact.pose.location_after,truth.persp.location)).toBeLessThan(1e-4);
    expect(JSON.stringify(exact)).not.toMatch(/Infinity|NaN/);
    expect(exact.pose.local_linear_sigma_note).toMatch(/not calibration truth/);

    // A far-off start stays within the user-visible rotation bound and says so.
    const bounded=reportOf(await fit('persp-far','persp-bounded',{landmarks:truth.persp.train,poseBounds:{maxRotationDeg:5,maxTranslationRatio:.05}}));
    expect(bounded.pose.rotation_limit_deg).toBe(5);
    expect(bounded.pose.rotation_change_deg).toBeLessThanOrEqual(5.0001);
    expect(bounded.pose.at_rotation_bound).toBe(true);
    expect(bounded.warnings.join(' ')).toContain('bound_limited');
    expect(bounded.rms_after_px).toBeLessThan(bounded.rms_before_px);
    expect(bounded.rms_after_px).toBeGreaterThan(10);

    // Orthographic pose: 5 DoF, depth fixed.
    const ortho=reportOf(await fit('ortho-perturbed','ortho-recovered',{landmarks:truth.ortho.train,heldoutLandmarks:truth.ortho.heldout}));
    expect(ortho.degrees_of_freedom).toBe(5);
    expect(ortho.pose.depth_fixed).toBe(true);
    expect(ortho.rms_before_px).toBeGreaterThan(20);
    expect(ortho.rms_after_px).toBeLessThan(.01);
    expect(ortho.heldout_rms_after_px).toBeLessThan(.01);
    expect(quaternionAngleDeg(ortho.pose.rotation_quaternion_after,truth.ortho.quaternion)).toBeLessThan(.01);

    // Degenerate, rank-deficient and invalid inputs fail without writing a candidate.
    const rejected=async (name:string, outputDir:string, extra:Record<string,unknown>, message:RegExp) => {
      const response:any=await fit(name,outputDir,extra);
      expect(response.isError).toBe(true);
      expect(JSON.stringify(response.content)).toMatch(message);
      expect(await Bun.file(join(dir,outputDir,'camera-fit.blend')).exists()).toBe(false);
    };
    const line=[-1,-.3,.4,1].map((z,i)=>({...truth.persp.train[0],name:'line'+i,localPoint:[-1,-1,z]}));
    await rejected('persp-truth','reject-collinear',{landmarks:line},/collinear/);
    await rejected('ortho-planar','reject-planar',{landmarks:truth.planar.train},/do not constrain camera pose/);
    await rejected('persp-truth','reject-three',{landmarks:truth.persp.train.slice(0,3)},/at least 4/);
    await rejected('persp-truth','reject-heldout-copy',{landmarks:truth.persp.train,heldoutLandmarks:[{...truth.persp.heldout[0],name:'t0'}]},/Held-out/);
    await rejected('persp-truth','reject-heldout-point',{landmarks:truth.persp.train,heldoutLandmarks:[{...truth.persp.train[1],name:'copy'}]},/Held-out/);
    const [t0,t1]=truth.persp.train;
    await rejected('persp-truth','reject-train-name',{landmarks:[...truth.persp.train,{...t1,name:t0.name,localPoint:[.5,.5,.5]}]},/must be unique/);
    await rejected('persp-truth','reject-train-point',{landmarks:[...truth.persp.train,{...t0,name:'again'}]},/must be unique/);
    await rejected('persp-truth','reject-train-world',{landmarks:[...truth.persp.train,{...t0,name:'near',localPoint:t0.localPoint.map((v:number)=>v+1e-8)}]},/same world point/);
    const [h0,h1]=truth.persp.heldout;
    await rejected('persp-truth','reject-heldout-name',{landmarks:truth.persp.train,heldoutLandmarks:[h0,{...h1,name:h0.name}]},/must be unique/);
    await rejected('persp-truth','reject-heldout-self',{landmarks:truth.persp.train,heldoutLandmarks:[h0,{...h0,name:'again'}]},/must be unique/);
    const framingBounds:any=await client.callTool({name:'blender_fit_reference_camera',arguments:{assetPath:join(dir,'persp-truth.blend'),outputDir:join(dir,'reject-framing-bounds'),
      referenceWidth:640,referenceHeight:480,landmarks:truth.persp.train,poseBounds:{maxRotationDeg:5},blenderPath:blender}});
    expect(framingBounds.isError).toBe(true);
    expect(JSON.stringify(framingBounds.content)).toMatch(/poseBounds/);

    // Direct CLI callers bypass the MCP schema; non-finite, boolean and empty values must fail clearly.
    const script=join(root,'skills/blender-asset-validation/scripts/fit_reference_camera.py');
    const marks=JSON.stringify(truth.persp.train);
    const cli=[
      [marks.replace(/"referenceUv":\[[^,]+,/, '"referenceUv":[NaN,'), [], /non-finite NaN/],
      [marks.replace(/"localPoint":\[[^,]+,/, '"localPoint":[true,'), [], /finite numeric/],
      [marks.replace(/"localPoint":\[[^,]+,/, '"localPoint":[Infinity,'), [], /non-finite Infinity/],
      [marks.replace(/"name":"t0"/, '"name":" "'), [], /nonempty name/],
      [marks, ['--max-rotation-deg','nan'], /Pose bounds/],
    ] as const;
    for (const [i,[landmarks,extra,message]] of cli.entries()) {
      const outputDir=join(dir,'cli-'+i);
      const run=await runBlender({blenderPath:blender!,scriptPath:script,timeoutMs:20000,scriptArgs:['--input',join(dir,'persp-truth.blend'),'--output-dir',outputDir,
        '--width','640','--height','480','--mode','pose','--landmarks-json',landmarks,...extra]});
      expect(run.exitCode).not.toBe(0);
      expect(run.stdout+run.stderr).toMatch(message);
      expect(await Bun.file(join(outputDir,'camera-fit.json')).exists()).toBe(false);
    }
  } finally {await client.close();await rm(dir,{recursive:true,force:true});}
},180000);
