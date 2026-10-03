import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runBlender } from "../../../scripts/blender-process.ts";
import { DEPOT_ASSETS, DEPOT_LAYOUT } from "./scene-tasks.ts";

type SceneEvaluation = {
  technicalPass: boolean; errors: string[]; directory: string; authored: any; exported: any;
  assetEvidence: Array<{ family: string; root: string; scope: string; contactSheet: string | null; contextSheet: string | null }>;
  status?: string; reproduction?: SceneEvaluation | null; visualQuality?: string; limitation?: string;
};

export function compareSceneExports(authored: any, exported: any): string[] {
  const errors: string[] = [];
  for (const asset of authored?.assets ?? []) {
    const imported = exported?.assets?.find((candidate: any) => candidate.root === asset.root);
    if (!imported) { errors.push(`Export lost asset: ${asset.root}`); continue; }
    for (const field of ["min", "max"]) {
      if (asset.bounds[field].some((value: number, index: number) => Math.abs(value - imported.bounds[field][index]) > 0.005))
        errors.push(`Export changed world bounds: ${asset.root}/${field}`);
    }
    if (asset.world_matrix.flat().some((value: number, index: number) => Math.abs(value - imported.world_matrix.flat()[index]) > 0.005))
      errors.push(`Export changed root transform: ${asset.root}`);
  }
  return errors;
}

export async function evaluateGameScene(workdir: string, blenderPath: string, options: { renderAssets?: boolean; reproductionDirectory?: string | null } = {}): Promise<SceneEvaluation> {
  const directory = join(workdir, "game-scene-evaluation");
  await mkdir(directory, { recursive: true });
  const manifest = join(workdir, "scene_manifest.json");
  if (!existsSync(manifest)) {
    const result = { technicalPass: false, errors: ["scene_manifest.json missing"], directory, authored: null, exported: null, assetEvidence: [] };
    await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
    return result;
  }
  const spec = join(directory, "spec.json");
  await writeFile(spec, JSON.stringify({ families: DEPOT_ASSETS, layout: DEPOT_LAYOUT, totalTriangles: 180000, maxMaterials: 24 }));
  const reports: Record<string, any> = {};
  const errors: string[] = [];
  for (const format of ["blend", "glb"]) {
    const output = join(directory, `${format}.json`);
    const process = await runBlender({ blenderPath, scriptPath: join(import.meta.dir, "inspect_game_scene.py"),
      scriptArgs: ["--input", join(workdir, `asset.${format}`), "--manifest", manifest, "--spec", spec, "--output", output],
      cwd: workdir, timeoutMs: 300_000 });
    await writeFile(join(directory, `${format}-process.json`), JSON.stringify(process, null, 2));
    if (process.exitCode || !existsSync(output)) errors.push(`${format} scene inspection failed`);
    else {
      reports[format] = JSON.parse(await readFile(output, "utf8"));
      errors.push(...reports[format].errors.map((error: string) => `${format}: ${error}`));
    }
  }
  if (reports.blend && reports.glb) errors.push(...compareSceneExports(reports.blend, reports.glb));
  const evidence = [];
  const renderer = resolve(import.meta.dir, "../../blender-asset-validation/scripts/render_evidence.py");
  const allMeshes: string[] = (reports.blend?.assets ?? []).flatMap((asset: any) => asset.meshes);
  for (const family of options.renderAssets === false ? [] : DEPOT_ASSETS) for (let index = 1; index <= family.count; index++) {
    const root = `${family.id}_${String(index).padStart(2, "0")}`;
    const representative = reports.blend?.assets?.find((asset: any) => asset.root === root);
    if (!representative?.meshes.length) { errors.push(`Missing asset evidence: ${root}`); continue; }
    const isolated = join(directory, "assets", root);
    const hidden = allMeshes.filter(name => !representative.meshes.includes(name));
    // These are explicitly isolated art-review views, never proof of scene contact.
    const process = await runBlender({ blenderPath, scriptPath: renderer,
      scriptArgs: ["--input", join(workdir, "asset.blend"), "--output-dir", isolated,
        "--resolution", "256", "--views", "perspective,front,back", "--presentation", "neutral",
        "--hide-objects-json", JSON.stringify(hidden)], cwd: workdir, timeoutMs: 180_000 });
    await writeFile(join(directory, `${root}-render-process.json`), JSON.stringify(process, null, 2));
    const sheet = join(isolated, "contact_sheet.png");
    if (process.exitCode || !existsSync(sheet)) errors.push(`Asset render failed: ${root}`);
    const context = join(directory, "context", root);
    const contextProcess = await runBlender({ blenderPath, scriptPath: renderer,
      scriptArgs: ["--input", join(workdir, "asset.blend"), "--output-dir", context,
        "--resolution", "256", "--views", "perspective,front,back", "--presentation", "neutral",
        "--focus-objects", JSON.stringify(representative.meshes)], cwd: workdir, timeoutMs: 180_000 });
    await writeFile(join(directory, `${root}-context-process.json`), JSON.stringify(contextProcess, null, 2));
    const contextSheet = join(context, "contact_sheet.png");
    if (contextProcess.exitCode || !existsSync(contextSheet)) errors.push(`Context render failed: ${root}`);
    evidence.push({ family: family.id, root: representative.root, scope: "isolated_art_and_contextual_placement_review",
      contactSheet: existsSync(sheet) ? sheet : null, contextSheet: existsSync(contextSheet) ? contextSheet : null });
  }
  let reproduction: SceneEvaluation | null = null;
  if (options.reproductionDirectory) {
    reproduction = await evaluateGameScene(options.reproductionDirectory, blenderPath, { renderAssets: false });
    errors.push(...reproduction.errors.map((error: string) => `Reproduction: ${error}`));
    if (reports.blend && reproduction.authored) errors.push(...compareSceneExports(reports.blend, reproduction.authored).map(error => `Reproduction: ${error}`));
  }
  const result = { technicalPass: errors.length === 0, status: errors.length ? "constraints_failed" : "review_required",
    errors, directory, authored: reports.blend ?? null, exported: reports.glb ?? null, assetEvidence: evidence,
    reproduction,
    visualQuality: "unreviewed; every instance needs a separate visual verdict; do not average away failed assets",
    limitation: "No target-engine integration or runtime performance claim. Support samples and collision candidates are not exhaustive." };
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  return result;
}
