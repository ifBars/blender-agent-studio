import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBlender } from "../../../scripts/blender-process.ts";
import { compareSceneExports } from "./scene-evidence.ts";
import { DEPOT_ASSETS, WHOLE_SCENE_TASK } from "./scene-tasks.ts";
import { scoreSubmission } from "./score.ts";

test("whole-scene scoring fails closed without independent scene evidence", () => {
  const score = scoreSubmission({ task: WHOLE_SCENE_TASK, agentExitCode: 0, sourceExists: true,
    reproductionPass: true, blendExists: true, glbExists: true, blendMetrics: null, glbMetrics: null });
  expect(score.hardGatePass).toBe(false);
  expect(score.checks.find(check => check.id === "whole_scene_technical_contract")?.passed).toBe(false);
});

test("whole scene keeps individual families critical and outside historical suites", () => {
  expect(DEPOT_ASSETS).toHaveLength(21);
  expect(DEPOT_ASSETS.reduce((count, asset) => count + asset.count, 0)).toBe(45);
  expect(WHOLE_SCENE_TASK.suites).toEqual(["whole_scene"]);
  expect(WHOLE_SCENE_TASK.visualCriteria.filter(criterion => criterion.id.startsWith("asset_") && criterion.critical)).toHaveLength(45);
});

test("fresh export comparison detects missing assets and world transform drift", () => {
  const asset = { root: "crate_01", bounds: { min: [0, 0, 0], max: [1, 1, 1] }, world_matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] };
  expect(compareSceneExports({ assets: [asset] }, { assets: [asset] })).toEqual([]);
  expect(compareSceneExports({ assets: [asset] }, { assets: [] })).toContain("Export lost asset: crate_01");
  const drift = structuredClone(asset); drift.world_matrix[0][3] = 0.1;
  expect(compareSceneExports({ assets: [asset] }, { assets: [drift] })).toContain("Export changed root transform: crate_01");
});

const blender = process.env.BLENDER_EXECUTABLE ?? Bun.which("blender");
test.skipIf(!blender)("live scene checks reject float, burial, orientation, support cycles and omitted assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bas-game-scene-"));
  try {
    const inspector = join(import.meta.dir, "inspect_game_scene.py").replaceAll("\\", "/");
    const output = join(directory, "results.json");
    const script = join(directory, "test.py");
    await writeFile(script, `import bpy, json, importlib.util, math, copy, sys
spec_module=importlib.util.spec_from_file_location('game_inspector', ${JSON.stringify(inspector)})
module=importlib.util.module_from_spec(spec_module);spec_module.loader.exec_module(module)
bpy.ops.wm.read_factory_settings(use_empty=True)
mat=bpy.data.materials.new('Palette');mat.diffuse_color=(0.4,0.3,0.2,1)
def asset(name, location, scale):
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
 root.location=location
 bpy.ops.mesh.primitive_cube_add(size=1)
 obj=bpy.context.object;obj.name=name+'_mesh';obj.parent=root;obj.location=(0,0,scale[2]/2)
 obj.scale=scale;obj.data.materials.append(mat)
 return root,obj
terrain,ground=asset('terrain_01',(0,0,-0.2),(20,16,0.2))
bench,body=asset('bench_01',(2,3,0),(0.8,0.6,0.5))
bpy.context.view_layer.update()
spec={'families':[{'id':'terrain','count':1,'triangles':100},{'id':'bench','count':1,'triangles':100}],'layout':{'bounds':{'min':[-10,-8,-0.35],'max':[10,8,7]},'anchors':[{'root':'bench_01','x':2,'y':3,'radius':1,'yawDegrees':0}]},'totalTriangles':1000,'maxMaterials':24}
manifest={'schemaVersion':1,'assets':[{'root':'terrain_01','family':'terrain','support':None,'supportMeshes':[],'supportMode':'foundation'},{'root':'bench_01','family':'bench','support':'terrain_01','supportMeshes':['bench_01_mesh'],'supportMode':'resting'}]}
results={}
def check(name):
 bpy.context.view_layer.update();results[name]=module.inspect(manifest,spec)
check('valid')
bench.location.z=.1;check('floating')
bench.location.z=-.05;check('buried')
bench.location.z=0;bench.rotation_euler.z=math.pi/2;check('rotation')
bench.rotation_euler.z=0;manifest['assets'][1]['support']='bench_01';check('self_support')
manifest['assets'][1]['support']='terrain_01';manifest['assets'][1]['supportMeshes']=[];check('missing_feet')
manifest['assets'][1]['supportMeshes']=['bench_01_mesh'];spec['families'][1]['count']=2;check('missing_instance')
spec['families'][1]['count']=1
export_path=sys.argv[-1]+'.glb'
bpy.ops.export_scene.gltf(filepath=export_path,export_format='GLB')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=export_path)
check('fresh_export')
json.dump(results,open(sys.argv[-1],'w'),indent=2)
`);
    const process = await runBlender({ blenderPath: blender!, scriptPath: script, scriptArgs: [output], cwd: directory, timeoutMs: 60_000 });
    expect(process.exitCode, process.stdout + process.stderr).toBe(0);
    const results = JSON.parse(await readFile(output, "utf8"));
    expect(results.valid.technicalPass, JSON.stringify(results.valid.errors)).toBe(true);
    expect(results.valid.status).toBe("review_required");
    expect(results.fresh_export.technicalPass, JSON.stringify(results.fresh_export.errors)).toBe(true);
    expect(compareSceneExports(results.valid, results.fresh_export)).toEqual([]);
    for (const name of ["floating", "buried", "rotation", "self_support", "missing_feet", "missing_instance"])
      expect(results[name].technicalPass, name).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 90_000);
