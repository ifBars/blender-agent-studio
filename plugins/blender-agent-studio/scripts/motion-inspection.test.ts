import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { runBlender } from "./blender-process.ts";
import { inspectMotion } from "../skills/blender-agent-benchmark/scripts/run_benchmark.ts";
import { assessMotionEvidence } from "../skills/blender-agent-benchmark/scripts/motion-evidence.ts";
import { QUALITY_TASKS } from "../skills/blender-agent-benchmark/scripts/quality-tasks.ts";

const blender=process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!blender)("live motion inspector detects local deformation, rejects rigid proxies, preserves source and supports fresh GLB",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"bas-motion-test-"));
  const client=new Client({name:"motion-test",version:"1"});
  try {
    const script=join(dir,"fixture.py");
    await writeFile(script,`import bpy, sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8)
obj=bpy.context.object
obj.name='Face'
obj.shape_key_add(name='Basis')
key=obj.shape_key_add(name='Smile')
for v in key.data: v.co.x *= 1.5
for frame,value in [(1,0),(13,1),(25,0.5),(37,1),(49,0.5),(61,0)]:
    key.value=value
    key.keyframe_insert(data_path='value', frame=frame)
bpy.context.scene.frame_start=1
bpy.context.scene.frame_end=61
bpy.context.scene.render.fps=24
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'asset.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'asset.glb'),export_animations=True)
obj.shape_key_clear()
for frame in (1,61):
    obj.location.x=frame/61
    obj.keyframe_insert(data_path='location',frame=frame)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'rigid.blend'))
`);
    const built=await runBlender({blenderPath:blender!,scriptPath:script,scriptArgs:[dir]});
    expect(built.exitCode,built.stderr+built.stdout).toBe(0);
    const task=QUALITY_TASKS.find(t=>t.id==="facial_expression_quality")!;
    const asset=join(dir,"asset.blend");
    const hash=async()=>createHash("sha256").update(await readFile(asset)).digest("hex");
    const before=await hash();
    const native=await inspectMotion(asset,join(dir,"native.json"),task,blender!);
    expect(assessMotionEvidence(task.motionRequirement!,native).passed,JSON.stringify(native)).toBe(true);
    const root=resolve(import.meta.dir,"..");
    await client.connect(new StdioClientTransport({command:"bun",args:[join(root,"mcp/server.ts")],cwd:root,stderr:"pipe"}));
    const args={assetPath:asset,outputJson:join(dir,"mcp.json"),frames:task.motionRequirement!.frames,objectNames:["Face"],blenderPath:blender};
    const sampled=await client.callTool({name:"blender_inspect_motion",arguments:args});
    expect(sampled.isError,JSON.stringify(sampled.content)).not.toBe(true);
    expect(assessMotionEvidence(task.motionRequirement!,(sampled.structuredContent as any).report).passed).toBe(true);
    const overwrite=await client.callTool({name:"blender_inspect_motion",arguments:args});
    expect(overwrite.isError).toBe(true);
    const unordered=await client.callTool({name:"blender_inspect_motion",arguments:{...args,outputJson:join(dir,"unordered.json"),frames:[13,1]}});
    expect(unordered.isError).toBe(true);
    const imported=await inspectMotion(join(dir,"asset.glb"),join(dir,"imported.json"),task,blender!);
    expect(assessMotionEvidence(task.motionRequirement!,imported,true).passed,JSON.stringify(imported)).toBe(true);
    const rigid=await inspectMotion(join(dir,"rigid.blend"),join(dir,"rigid.json"),task,blender!);
    expect(assessMotionEvidence(task.motionRequirement!,rigid).passed).toBe(false);
    expect(await hash()).toBe(before);
    // The CLI rejects invalid sample requests before producing an evidence file.
    const bad=await runBlender({blenderPath:blender!,scriptPath:resolve(import.meta.dir,"../skills/blender-asset-validation/scripts/inspect_motion.py"),
      scriptArgs:["--input",asset,"--output",join(dir,"bad.json"),"--frames","1,1","--targets","Face"]});
    expect(bad.exitCode).not.toBe(0);
  } finally {await client.close();await rm(dir,{recursive:true,force:true});}
},120_000);

test.skipIf(!blender)("live fluid inspector distinguishes unbaked settings from a reopened liquid bake",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"bas-liquid-test-"));
  try {
    const script=join(dir,"liquid.py");
    await writeFile(script,`import bpy, sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.frame_start=1
scene.frame_end=8
bpy.ops.mesh.primitive_cube_add(size=2)
domain=bpy.context.object
domain.name='LiquidDomain'
mod=domain.modifiers.new('Domain','FLUID')
mod.fluid_type='DOMAIN'
settings=mod.domain_settings
settings.domain_type='LIQUID'
settings.resolution_max=16
settings.use_mesh=True
settings.cache_type='ALL'
settings.cache_frame_start=1
settings.cache_frame_end=8
settings.cache_directory='//cache'
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=0.4,location=(0,0,0.3))
flow=bpy.context.object.modifiers.new('Flow','FLUID')
flow.fluid_type='FLOW'
flow.flow_settings.flow_type='LIQUID'
flow.flow_settings.flow_behavior='GEOMETRY'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'unbaked.blend'))
bpy.context.view_layer.objects.active=domain
bpy.ops.fluid.bake_all()
scene.frame_set(4)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'baked.blend'))
`);
    const built=await runBlender({blenderPath:blender!,scriptPath:script,scriptArgs:[dir],timeoutMs:120_000});
    expect(built.exitCode,built.stderr+built.stdout).toBe(0);
    const base=QUALITY_TASKS.find(t=>t.id==="liquid_pour_quality")!;
    const task={...base,motionRequirement:{...base.motionRequirement!,frames:[2,4,8]}};
    const unbaked=await inspectMotion(join(dir,"unbaked.blend"),join(dir,"unbaked.json"),task,blender!);
    expect(assessMotionEvidence(task.motionRequirement,unbaked).passed).toBe(false);
    const baked=await inspectMotion(join(dir,"baked.blend"),join(dir,"baked.json"),task,blender!);
    expect(assessMotionEvidence(task.motionRequirement,baked).passed,JSON.stringify(baked)).toBe(true);
  } finally {await rm(dir,{recursive:true,force:true});}
},180_000);
