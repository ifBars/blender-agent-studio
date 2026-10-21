import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { runBlender } from "./blender-process.ts";
import { analyzeSceneIR, runtimeExecutable } from "./scene-analysis.ts";

const name = z.string().min(1).max(256);
const surfaceWeightsSchema = z.array(z.tuple([
  z.number().int().min(0).max(499_999), z.number().positive().max(1),
])).min(1).max(4096);
export const attachmentSchema = z.object({
  assetPath: z.string(), outputJson: z.string().describe("New evidence JSON path in an existing directory."),
  baselineJson: z.string().optional().describe("Optional preserved output from this tool. Recomputes baseline checks and compares the same selectors, frames, units and tolerances; changed bindings require renewed review."),
  frames: z.array(z.number().int().min(-1_048_574).max(1_048_574)).min(2).max(12),
  anchors: z.array(z.object({
    id: name, objectName: name,
    vertexIndices: z.array(z.number().int().min(0).max(499_999)).min(1).max(4096).optional(),
    vertexGroup: name.optional(),
  }).strict()).min(2).max(32).describe("Fixed small surface patches. Exactly one original-mesh index list or vertex group per anchor. Use multiple pairs around a boundary to catch rotation; broad centroids can hide gaps."),
  connections: z.array(z.object({
    name, anchorA: name, anchorB: name,
    maxDistance: z.number().min(0).max(1e9).describe("Explicit permitted gap in scene world units; preserve this threshold across repairs."),
  }).strict()).min(1).max(32),
  blenderPath: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(300_000).default(120_000),
});
export type AttachmentRequest = z.infer<typeof attachmentSchema>;

export function validateAttachmentRequest(input: AttachmentRequest): AttachmentRequest {
  const args = attachmentSchema.parse(input);
  if (args.frames.some((f, i) => i > 0 && f <= args.frames[i - 1])) throw new Error("frames must be distinct and increasing");
  const ids = new Set(args.anchors.map(a => a.id));
  if (ids.size !== args.anchors.length) throw new Error("Anchor IDs must be unique");
  for (const a of args.anchors) {
    if ((a.vertexIndices !== undefined) === (a.vertexGroup !== undefined)) throw new Error("Use exactly one vertexIndices or vertexGroup selector");
    if (a.vertexIndices && new Set(a.vertexIndices).size !== a.vertexIndices.length) throw new Error("Vertex indices must be distinct");
  }
  if (new Set(args.connections.map(c => c.name)).size !== args.connections.length) throw new Error("Connection names must be unique");
  for (const c of args.connections) {
    if (!ids.has(c.anchorA) || !ids.has(c.anchorB) || c.anchorA === c.anchorB) throw new Error("Connections require two distinct declared anchors");
    const a = args.anchors.find(a => a.id === c.anchorA)!;
    const b = args.anchors.find(a => a.id === c.anchorB)!;
    if (a.objectName === b.objectName && (
      (a.vertexGroup !== undefined && a.vertexGroup === b.vertexGroup) ||
      (a.vertexIndices !== undefined && b.vertexIndices !== undefined &&
        JSON.stringify([...a.vertexIndices].sort((x, y) => x - y)) === JSON.stringify([...b.vertexIndices].sort((x, y) => x - y)))
    )) throw new Error(`Connection ${c.name} selects the same surface patch on both sides`);
  }
  return args;
}

export async function assessAttachmentEvidence(evidence: any, args: AttachmentRequest) {
  if (evidence.schema_version !== "bas-surface-motion/0.1" ||
      !/^[a-f0-9]{64}$/.test(evidence.source_sha256 ?? "") ||
      !Array.isArray(evidence.scenes) || evidence.scenes.length !== args.frames.length ||
      !Array.isArray(evidence.bindings) || evidence.bindings.length !== args.anchors.length) throw new Error("Incomplete surface motion evidence");
  const ids = args.anchors.map(a => `bas:surface:${a.id}`).sort();
  if (JSON.stringify(evidence.bindings.map((b: any) => b.id).sort()) !== JSON.stringify(ids) ||
      evidence.bindings.some((b: any) => !/^[a-f0-9]{64}$/.test(b.binding_sha256 ?? "") ||
        (b.surface_weights !== undefined && !surfaceWeightsSchema.safeParse(b.surface_weights).success))) throw new Error("Missing surface bindings");
  for (const c of args.connections) {
    const a = evidence.bindings.find((b: any) => b.id === `bas:surface:${c.anchorA}`);
    const b = evidence.bindings.find((b: any) => b.id === `bas:surface:${c.anchorB}`);
    // Blender stores weights as float32. Compare normalized weights with a
    // relative tolerance, rather than hashing floats or quantizing at boundaries.
    // Keep the exact binding hash for repair comparisons and legacy evidence.
    const samePatch = a.object_name === b.object_name && a.surface_weights && b.surface_weights &&
      a.surface_weights.length === b.surface_weights.length &&
      a.surface_weights.every(([index, weight]: number[], i: number) =>
        index === b.surface_weights[i][0] &&
        Math.abs(weight - b.surface_weights[i][1]) <= 1e-6 * Math.max(weight, b.surface_weights[i][1]));
    if (a.binding_sha256 === b.binding_sha256 ||
        samePatch) {
      throw new Error(`Connection ${c.name} resolves to the same surface patch on both sides`);
    }
  }
  const samples = [];
  for (let i = 0; i < args.frames.length; i++) {
    const scene = evidence.scenes[i];
    if (scene.frame !== args.frames[i] || scene.source !== evidence.scenes[0].source ||
        scene.meters_per_unit !== evidence.scenes[0].meters_per_unit ||
        JSON.stringify(scene.objects.map((o: any) => o.id).sort()) !== JSON.stringify(ids)) throw new Error("Surface sample coverage or units changed");
    const analysis = await analyzeSceneIR(scene, {
      connection_points: args.connections.map(c => ({
        name: c.name, object_a: `bas:surface:${c.anchorA}`, object_b: `bas:surface:${c.anchorB}`,
        point_a: [0, 0, 0], point_b: [0, 0, 0], max_distance: c.maxDistance,
      })),
    });
    if (!Array.isArray(analysis.connection_checks) ||
        analysis.connection_checks.length !== args.connections.length ||
        args.connections.some(c => {
          const checks = analysis.connection_checks.filter((check: any) => check.name === c.name);
          return checks.length !== 1 || !Number.isFinite(checks[0].distance) ||
            checks[0].distance < 0 || checks[0].max_distance !== c.maxDistance ||
            checks[0].status !== (checks[0].distance > c.maxDistance ? "gap_detected" : "within_tolerance");
        })) throw new Error("Runtime returned incomplete or inconsistent attachment checks");
    samples.push({ frame: scene.frame, checks: analysis.connection_checks });
  }
  const connections = args.connections.map(c => {
    const observations = samples.map(s => ({ frame: s.frame, ...s.checks.find((v: any) => v.name === c.name) }));
    const worst = observations.reduce((a, b) => a.distance >= b.distance ? a : b);
    return { name: c.name, maxDistance: c.maxDistance, worstFrame: worst.frame,
      maximumDistance: worst.distance, status: worst.status,
      failingFrames: observations.filter(o => o.status === "gap_detected").map(o => o.frame) };
  });
  const anchorMotion = ids.map(id => {
    const positions = evidence.scenes.map((scene: any) => scene.objects.find((o: any) => o.id === id).world_matrix.slice(0, 3).map((row: number[]) => row[3]));
    return { id, maximumDisplacementFromFirstFrame: Math.max(...positions.map((p: number[]) =>
      Math.hypot(...p.map((value: number, axis: number) => value - positions[0][axis])))) };
  });
  return {
    status: connections.some(c => c.failingFrames.length) ? "constraints_failed" : "review_required",
    sourceSha256: evidence.source_sha256, metersPerUnit: evidence.scenes[0].meters_per_unit,
    // Keep full selectors and weights in the preserved evidence. Duplicating
    // them in the report can exceed the baseline input limit for large patches.
    bindings: evidence.bindings.map(({ surface_weights, selector, ...binding }: any) => binding),
    connections, samples, anchorMotion,
    limitations: [
      "Only declared surface patches and sampled frames are measured; no aesthetic or animation-quality pass.",
      "Centroids can conceal rotation, penetration and local gaps. Review multiple boundary pairs and rendered closeups.",
      "Keep selectors, thresholds, poses and cameras fixed for repair comparisons. Rebinding after topology changes requires renewed visual verification.",
      "Inspect native and freshly imported export separately; exported topology and vertex groups may differ.",
      "Stationary anchors do not demonstrate that the poses exercised this attachment. Review anchorMotion and pose evidence.",
    ],
  };
}

export function compareAttachmentReports(baseline: Awaited<ReturnType<typeof assessAttachmentEvidence>>,
  candidate: Awaited<ReturnType<typeof assessAttachmentEvidence>>) {
  if (baseline.metersPerUnit !== candidate.metersPerUnit) throw new Error("Baseline unit scale differs");
  const oldBindings = new Map(baseline.bindings.map((b: any) => [b.id, b.binding_sha256]));
  const changedBindings = candidate.bindings.filter((b: any) => oldBindings.get(b.id) !== b.binding_sha256).map((b: any) => b.id);
  const changes = candidate.connections.map(c => {
    const previous = baseline.connections.find(b => b.name === c.name)!;
    return { name: c.name, baselineMaximumDistance: previous.maximumDistance,
      candidateMaximumDistance: c.maximumDistance, distanceDelta: c.maximumDistance - previous.maximumDistance,
      repairedFrames: previous.failingFrames.filter((f: number) => !c.failingFrames.includes(f)),
      newlyFailingFrames: c.failingFrames.filter((f: number) => !previous.failingFrames.includes(f)) };
  });
  return { status: changedBindings.length ? "rebind_review_required" :
    changes.some(c => c.newlyFailingFrames.length) ? "constraints_regressed" :
    changes.some(c => c.repairedFrames.length) ? "selected_constraints_improved" : "no_constraint_status_change",
    changedBindings, changes, baselineSourceSha256: baseline.sourceSha256,
    candidateSourceSha256: candidate.sourceSha256,
    limitation: "This compares declared sampled constraints, not overall character quality. Inspect the same rendered poses before retaining the repair." };
}

export async function inspectAttachments(input: AttachmentRequest) {
  const args = validateAttachmentRequest(input);
  runtimeExecutable();
  const output = resolve(args.outputJson);
  if (existsSync(output)) throw new Error("outputJson must be a new file");
  let baselineReport: Awaited<ReturnType<typeof assessAttachmentEvidence>> | undefined;
  if (args.baselineJson) {
    if ((await stat(args.baselineJson)).size > 16 * 1024 * 1024) throw new Error("Baseline evidence exceeds 16 MiB");
    const baseline = JSON.parse(await readFile(args.baselineJson, "utf8"));
    const previous = validateAttachmentRequest(baseline.request);
    for (const key of ["frames", "anchors", "connections"] as const) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(args[key])) throw new Error(`Baseline ${key} differ; preserve the original inspection contract`);
    }
    baselineReport = await assessAttachmentEvidence(baseline.evidence, previous);
  }
  const temporary = await mkdtemp(join(tmpdir(), "bas-attachments-"));
  try {
    const request = join(temporary, "request.json"), extracted = join(temporary, "evidence.json");
    await writeFile(request, JSON.stringify({ frames: args.frames, anchors: args.anchors }));
    const process = await runBlender({
      blenderPath: args.blenderPath, timeoutMs: args.timeoutMs,
      scriptPath: resolve(import.meta.dir, "../skills/blender-asset-validation/scripts/inspect_attachments.py"),
      scriptArgs: ["--input", resolve(args.assetPath), "--output", extracted, "--request", request],
    });
    if (process.exitCode !== 0 || process.timedOut) throw new Error(`Surface extraction failed: ${process.stderr || process.stdout}`);
    if ((await stat(extracted)).size > 8 * 1024 * 1024) throw new Error("Surface evidence exceeds 8 MiB");
    const evidence = JSON.parse(await readFile(extracted, "utf8"));
    const report = await assessAttachmentEvidence(evidence, args);
    const comparison = baselineReport ? compareAttachmentReports(baselineReport, report) : null;
    await writeFile(output, JSON.stringify({ request: args, evidence, report, comparison }, null, 2), { flag: "wx" });
    return { report, comparison, outputJson: output };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
