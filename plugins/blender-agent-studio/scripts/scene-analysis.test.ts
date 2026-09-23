import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { analyzeSceneIR, compareSceneIR, runtimeExecutable } from "./scene-analysis.ts";
import { runBlender } from "./blender-process.ts";

let runtimeAvailable = false;
try { runtimeExecutable(); runtimeAvailable = true; } catch {}
const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
const root = resolve(import.meta.dir, "..");
const emptyScene = {schema_version:"bas-scene-ir/0.1",source:"fixture",blender_version:"test",frame:1,meters_per_unit:1,limitations:[],objects:[]};

test.skipIf(!runtimeAvailable)("runtime protocol rejects unsupported schemas and reports empty scenes", async () => {
  await expect(analyzeSceneIR({...emptyScene, schema_version:"future"}, {})).rejects.toThrow("Unsupported SceneIR");
  await expect(analyzeSceneIR(emptyScene, {limit:201})).rejects.toThrow("Invalid pagination");
  const output = await analyzeSceneIR(emptyScene, {});
  expect(output.quality.status).toBe("constraints_failed");
});

test.skipIf(!runtimeAvailable)("runtime compares SceneIR snapshots without treating undeclared changes as failures", async () => {
  const object = {id:"part",kind:"MESH",parent:null,semantic_role:"body",
    world_matrix:[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],
    bounds:{min:[0,0,0],max:[1,1,1]},mesh:{vertices:8,triangles:12,connected_components:1,non_manifold_edges:0,degenerate_faces:0,missing_material_faces:0}};
  const baseline = {...emptyScene, objects:[object]};
  const candidate = {...emptyScene, source:"candidate", objects:[{...object,
    bounds:{min:[0.25,0,0],max:[1.25,1,1]},mesh:{...object.mesh,triangles:16}}]};
  const factual = await compareSceneIR(baseline, candidate, {});
  expect(factual.summary.changed).toBe(1);
  expect(factual.regression.status).toBe("review_required");
  const constrained = await compareSceneIR(baseline, candidate, {invariant_objects:["part"],max_center_shift:0.1,max_triangle_increase:2});
  expect(constrained.regression.status).toBe("constraints_failed");
  expect(constrained.regression.items.map((item:any)=>item.code)).toEqual(["center_shift","triangle_increase"]);
});

test.skipIf(!runtimeAvailable || !blender)("live Blender scene and fresh GLB import through MCP preserve source and evaluated transforms", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bas-understanding-test-"));
  const client = new Client({name:"bas-scene-test",version:"1"});
  try {
    const built = await runBlender({blenderPath:blender!, scriptPath:join(root,"skills/blender-asset-validation/scripts/_blender_scene_ir_fixture.py"),scriptArgs:[temporary]});
    expect(built.exitCode, built.stderr + built.stdout).toBe(0);
    const assetPath = join(temporary,"fixture.blend");
    const digest = async () => createHash("sha256").update(await readFile(assetPath)).digest("hex");
    const original = await digest();
    await client.connect(new StdioClientTransport({command:"bun",args:[join(root,"mcp/server.ts")],cwd:root,stderr:"pipe"}));
    const outputJson = join(temporary,"analysis.json");
    const described = await client.callTool({name:"blender_describe_scene",arguments:{assetPath,outputJson,blenderPath:blender,objectId:"assembly",limit:1}});
    expect(described.isError, JSON.stringify(described.content)).not.toBe(true);
    const data = described.structuredContent as any;
    expect(data.selection.object_count).toBe(3);
    expect(data.selection.triangles).toBe(36);
    expect(data.pagination.next_offset).toBe(1);
    const saved = JSON.parse(await readFile(outputJson,"utf8"));
    const body = saved.scene.objects.find((o: any) => o.id === "body");
    expect(body.semantic_role).toBe("torso");
    expect(body.bounds.min).toEqual([9,-1,-0.5]);
    expect(body.bounds.max).toEqual([17,1,0.5]);
    expect(body.mesh.connected_components).toBe(2);
    expect(body.mesh.triangles).toBe(24);
    const posed = await client.callTool({name:"blender_describe_scene",arguments:{assetPath,blenderPath:blender,frame:20,objectId:"foot"}});
    expect(posed.isError, JSON.stringify(posed.content)).not.toBe(true);
    expect((posed.structuredContent as any).selection.bounds.min[2]).toBe(4);
    const badFrame = await client.callTool({name:"blender_describe_scene",arguments:{assetPath,frame:1.5}});
    expect(badFrame.isError).toBe(true);
    const quality = await client.callTool({name:"blender_quality_report",arguments:{assetPath,blenderPath:blender,triangleBudget:35,groundZ:0,groundObjects:["foot"],limit:1}});
    expect(quality.isError, JSON.stringify(quality.content)).not.toBe(true);
    expect((quality.structuredContent as any).quality.status).toBe("constraints_failed");
    expect((quality.structuredContent as any).quality.issues).toContainEqual({severity:"warning",code:"above_ground_plane",object:"foot",signed_distance:2});
    const contact = await client.callTool({name:"blender_quality_report",arguments:{assetPath,blenderPath:blender,contactPairs:[["body","foot"]],limit:1}});
    expect(contact.isError,JSON.stringify(contact.content)).not.toBe(true);
    expect((contact.structuredContent as any).contact_checks[0]).toMatchObject({status:"gap_detected",aabb_distance_lower_bound:1.5});
    const anchored = await client.callTool({name:"blender_quality_report",arguments:{assetPath,blenderPath:blender,limit:1,connectionPoints:[{name:"body-to-foot",objectA:"body",pointA:[0,0,0],objectB:"foot",pointB:[0,0,0],maxDistance:0.01}]}});
    expect(anchored.isError,JSON.stringify(anchored.content)).not.toBe(true);
    const check=(anchored.structuredContent as any).connection_checks[0];
    expect(check.status).toBe("gap_detected");
    expect(check.distance).toBeGreaterThan(0.01);
    expect(check.delta_world_b_minus_a).toHaveLength(3);
    const imported = await client.callTool({name:"blender_describe_scene",arguments:{assetPath:join(temporary,"fixture.glb"),blenderPath:blender}});
    expect(imported.isError, JSON.stringify(imported.content)).not.toBe(true);
    expect((imported.structuredContent as any).selection.triangles).toBe(36);
    expect((imported.structuredContent as any).selection.bounds).toEqual(data.selection.bounds);
    const compared = await client.callTool({name:"blender_compare_scenes",arguments:{
      baselineAssetPath:assetPath,candidateAssetPath:assetPath,blenderPath:blender,
      invariantObjects:["body","foot"],preserveParenting:true,forbidNewTopologyFindings:true,
    }});
    expect(compared.isError, JSON.stringify(compared.content)).not.toBe(true);
    expect((compared.structuredContent as any).summary).toMatchObject({added:0,removed:0,changed:0,unchanged:3,triangle_delta:0});
    expect((compared.structuredContent as any).regression.status).toBe("review_required");
    const mismatchedFrame = await client.callTool({name:"blender_compare_scenes",arguments:{baselineAssetPath:assetPath,candidateAssetPath:join(temporary,"posed.blend"),blenderPath:blender}});
    expect(mismatchedFrame.isError).toBe(true);
    expect(JSON.stringify(mismatchedFrame.content)).toContain("Scene frames differ");
    const sameFrame = await client.callTool({name:"blender_compare_scenes",arguments:{baselineAssetPath:assetPath,candidateAssetPath:join(temporary,"posed.blend"),blenderPath:blender,frame:20}});
    expect(sameFrame.isError,JSON.stringify(sameFrame.content)).not.toBe(true);
    expect((sameFrame.structuredContent as any).summary.changed).toBe(0);
    const mismatchedUnits = await client.callTool({name:"blender_compare_scenes",arguments:{baselineAssetPath:assetPath,candidateAssetPath:join(temporary,"units.blend"),blenderPath:blender,frame:1}});
    expect(mismatchedUnits.isError).toBe(true);
    expect(JSON.stringify(mismatchedUnits.content)).toContain("unit scales differ");
    const failed = await client.callTool({name:"blender_describe_scene",arguments:{assetPath,outputJson,blenderPath:blender}});
    expect(failed.isError).toBe(true);
    expect(JSON.stringify(failed.content)).toContain("new file");
    const missing = await client.callTool({name:"blender_describe_scene",arguments:{assetPath:join(temporary,"missing.blend"),blenderPath:blender}});
    expect(missing.isError).toBe(true);
    expect(missing.structuredContent).toBeUndefined();
    expect(await digest()).toBe(original);
  } finally { await client.close(); await rm(temporary,{recursive:true,force:true}); }
}, 120_000);
