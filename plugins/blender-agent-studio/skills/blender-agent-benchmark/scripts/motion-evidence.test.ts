import { expect, test } from "bun:test";
import { assessMotionEvidence, type MotionEvidence, type MotionRequirement } from "./motion-evidence.ts";
import { scoreSubmission } from "./score.ts";
import { QUALITY_TASKS } from "./quality-tasks.ts";

const requirement: MotionRequirement = {frames:[1,12],targets:[{object:"Body",change:"deformation",modifier:"ARMATURE"}]};
function evidence(): MotionEvidence {
  return {schema_version:1,source_sha256:"a".repeat(64),frames:[1,12],
    modifiers:{Body:[{type:"ARMATURE",enabled:true}]},
    samples:[1,12].map((frame,i)=>({frame,objects:[{name:"Body",vertices:8,polygons:6,
      local_geometry_sha256:String(i).repeat(64),world_matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}]}))};
}

test("requires evaluated deformation, not just keyframes, modifiers or root movement",()=>{
  expect(assessMotionEvidence(requirement,evidence()).passed).toBe(true);
  const staticBody=evidence();
  staticBody.samples[1].objects[0].local_geometry_sha256=staticBody.samples[0].objects[0].local_geometry_sha256;
  staticBody.samples[1].objects[0].world_matrix[3]=2;
  expect(assessMotionEvidence(requirement,staticBody).passed).toBe(false);
});

test("rejects missing, malformed, wrong-frame, duplicate and empty evidence",()=>{
  for(const value of [null,{}, {schema_version:1}, {...evidence(),frames:[1,13]}])
    expect(assessMotionEvidence(requirement,value).passed).toBe(false);
  for(const mutate of [
    (r:MotionEvidence)=>{r.samples[1].objects=[];},
    (r:MotionEvidence)=>{r.samples[1].objects.push(r.samples[1].objects[0]);},
    (r:MotionEvidence)=>{r.samples[1].objects[0].vertices=0;},
    (r:MotionEvidence)=>{r.samples[1].objects[0].world_matrix[0]=NaN;},
    (r:MotionEvidence)=>{r.modifiers.Body[0].enabled=false;},
  ]) {const r=evidence();mutate(r);expect(assessMotionEvidence(requirement,r).passed).toBe(false);}
});

test("liquid requires actual liquid domain bake metadata, cache files and timeline coverage",()=>{
  const liquid:MotionRequirement={...requirement,targets:[{object:"Body",change:"deformation",modifier:"LIQUID"}]};
  const report=evidence();
  report.modifiers.Body=[{type:"FLUID",enabled:true,domain_type:"LIQUID",cache_type:"MODULAR",
    baked_data:true,baked_mesh:true,use_mesh:true,frame_start:1,frame_end:12,cache_files:{nonempty_files:24,truncated:false}}];
  expect(assessMotionEvidence(liquid,report).passed).toBe(true);
  for(const patch of [{domain_type:"GAS"},{cache_type:"REPLAY"},{baked_mesh:false},{frame_end:11},
    {cache_files:{nonempty_files:0,truncated:false}},{cache_files:{nonempty_files:24,truncated:true}}]) {
    const broken=structuredClone(report);Object.assign(broken.modifiers.Body[0],patch);
    expect(assessMotionEvidence(liquid,broken).passed).toBe(false);
  }
});

test("cloth requires a bake, while exported deformation does not require native modifiers",()=>{
  const cloth:MotionRequirement={...requirement,targets:[{object:"Body",change:"deformation",modifier:"CLOTH"}]};
  const report=evidence();report.modifiers.Body=[{type:"CLOTH",enabled:true,baked:false,frame_start:1,frame_end:12}];
  expect(assessMotionEvidence(cloth,report).passed).toBe(false);
  report.modifiers.Body[0].baked=true;
  expect(assessMotionEvidence(cloth,report).passed).toBe(true);
  report.modifiers={};
  expect(assessMotionEvidence(requirement,report,true).passed).toBe(true);
});

test("quality tasks reject missing observed motion even when legacy metrics pass",()=>{
  const task=QUALITY_TASKS.find(t=>t.id==="liquid_pour_quality")!;
  const metrics={hard_gate_pass:true,objects:[{name:"basin"}],scene:{bounds:{dimensions:[1,1,1]}},
    totals:{triangles:2000,mesh_objects:3,materials:3,simulation_modifiers:3,smooth_polygons:1000,flat_polygons:0}};
  const options={task,agentExitCode:0,sourceExists:true,reproductionPass:true,blendExists:true,glbExists:true,
    blendMetrics:metrics,glbMetrics:metrics,videoEvidence:{exists:true,durationSeconds:3,frameRate:24,frameCount:72,probeError:null}};
  const score=scoreSubmission(options);
  expect(score.checks.find(c=>c.id==="observed_motion")?.passed).toBe(false);
  expect(score.checks.find(c=>c.id==="rendered_video")?.passed).toBe(true);
  expect(score.hardGatePass).toBe(false);
  expect(scoreSubmission({...options,videoEvidence:null}).checks.find(c=>c.id==="rendered_video")?.passed).toBe(false);
});
