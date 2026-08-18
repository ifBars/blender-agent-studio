import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type FitMetrics = {
  pass: boolean;
  median_clearance_mm: number;
  p95_clearance_mm: number;
  large_gap_fraction: number;
  hair_width_ratio: number;
  hair_bones: number;
  style_meshes: string[];
  scalp_coverage_fraction: number;
  rear_scalp_coverage_fraction: number;
};

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function sha256(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await readFile(path));
  return hasher.digest("hex");
}

async function run(command: string[], cwd: string) {
  const startedAt = performance.now();
  const process = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  return { command, exitCode, stdout, stderr, durationMs: Math.round(performance.now() - startedAt) };
}

const head = arg("--head");
const headTexture = arg("--head-texture");
const output = arg("--output");
const blender = arg("--blender") ?? process.env.BLENDER_EXECUTABLE;
const assets = [
  ["sophia", arg("--sophia")],
  ["gulag", arg("--gulag")],
  ["ld", arg("--ld")],
  ["suzumes", arg("--suzumes")],
] as const;
if (!head || !output || !blender || assets.some(([, path]) => !path)) {
  throw new Error("Required: --head --sophia --gulag --ld --suzumes --output and --blender (or BLENDER_EXECUTABLE)");
}
const outputRoot = resolve(output);
if (existsSync(outputRoot)) {
  throw new Error(`Output already exists; benchmark evidence is immutable: ${outputRoot}`);
}
await mkdir(outputRoot, { recursive: true });

const benchmarkRoot = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(benchmarkRoot, "..", "..", "blender-character-workflow");
const fitter = join(skillRoot, "scripts", "fit_vrchat_hair.py");
const renderer = resolve(benchmarkRoot, "..", "..", "blender-asset-validation", "scripts", "render_evidence.py");
const results = [];

for (const [id, hair] of assets) {
  for (const mode of ["naive", "cranial"] as const) {
    const workdir = join(outputRoot, id, mode);
    await mkdir(workdir, { recursive: true });
    const fitProcess = await run([
      blender, "--background", "--factory-startup", "--python", fitter, "--",
      "--head", resolve(head), "--hair", resolve(hair!), "--mode", mode,
      "--output-blend", join(workdir, "asset.blend"),
      "--output-glb", join(workdir, "asset.glb"),
      "--metrics", join(workdir, "fit_metrics.json"),
    ], workdir);
    await writeFile(join(workdir, "fit-process.json"), JSON.stringify(fitProcess, null, 2));
    if (fitProcess.exitCode !== 0) throw new Error(`${id}/${mode} fit failed`);
    const renderProcess = await run([
      blender, "--background", "--factory-startup", "--python", renderer, "--",
      "--input", join(workdir, "asset.blend"), "--output-dir", join(workdir, "evidence"),
      "--resolution", "512", "--material-mode", "vrchat-fit",
      ...(headTexture ? ["--head-texture", resolve(headTexture)] : []),
    ], workdir);
    await writeFile(join(workdir, "render-process.json"), JSON.stringify(renderProcess, null, 2));
    if (renderProcess.exitCode !== 0) throw new Error(`${id}/${mode} evidence render failed`);
    const styleEvidence = [];
    if (id === "sophia" && mode === "cranial") {
      for (const [style, hidden] of [["ponytail", "Space Buns"], ["space-buns", "PonyTail"]] as const) {
        const styleOutput = join(workdir, `evidence-${style}`);
        const styleProcess = await run([
          blender, "--background", "--factory-startup", "--python", renderer, "--",
          "--input", join(workdir, "asset.blend"), "--output-dir", styleOutput,
          "--resolution", "512", "--material-mode", "vrchat-fit", "--hide-objects", hidden,
          ...(headTexture ? ["--head-texture", resolve(headTexture)] : []),
        ], workdir);
        await writeFile(join(workdir, `render-${style}-process.json`), JSON.stringify(styleProcess, null, 2));
        if (styleProcess.exitCode !== 0) throw new Error(`${id}/${mode}/${style} evidence render failed`);
        styleEvidence.push({ style, hidden, contactSheet: join(styleOutput, "contact_sheet.png") });
      }
    }
    const metrics = JSON.parse(await readFile(join(workdir, "fit_metrics.json"), "utf8")) as FitMetrics;
    results.push({
      id, mode, metrics, styleEvidence,
      durationMs: fitProcess.durationMs + renderProcess.durationMs,
      hashes: {
        blend: await sha256(join(workdir, "asset.blend")),
        glb: await sha256(join(workdir, "asset.glb")),
        contactSheet: await sha256(join(workdir, "evidence", "contact_sheet.png")),
      },
    });
  }
}

const comparisons = assets.map(([id]) => {
  const baseline = results.find((item) => item.id === id && item.mode === "naive")!;
  const candidate = results.find((item) => item.id === id && item.mode === "cranial")!;
  return {
    id,
    baselinePass: baseline.metrics.pass,
    candidatePass: candidate.metrics.pass,
    medianClearanceImprovementMm: baseline.metrics.median_clearance_mm - candidate.metrics.median_clearance_mm,
    p95ClearanceImprovementMm: baseline.metrics.p95_clearance_mm - candidate.metrics.p95_clearance_mm,
    scalpCoverage: candidate.metrics.scalp_coverage_fraction,
    rearScalpCoverage: candidate.metrics.rear_scalp_coverage_fraction,
    preservedHairBones: candidate.metrics.hair_bones,
    preservedStyleMeshes: candidate.metrics.style_meshes,
  };
});
const report = {
  schemaVersion: 1,
  benchmark: "vrchat-hair-fit-algorithm",
  scope: "targeted algorithm comparison; not a general agent capability claim",
  blender,
  head: resolve(head),
  headTexture: headTexture ? resolve(headTexture) : null,
  assets: Object.fromEntries(assets.map(([id, path]) => [id, resolve(path!)])),
  results,
  comparisons,
  pass: comparisons.every((item) => !item.baselinePass && item.candidatePass),
};
await writeFile(join(outputRoot, "benchmark-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output: outputRoot, pass: report.pass, comparisons }, null, 2));
