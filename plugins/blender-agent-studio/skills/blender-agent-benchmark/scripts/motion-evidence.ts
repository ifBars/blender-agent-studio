export type MotionRequirement = {
  frames: number[];
  targets: Array<{
    object: string;
    change: "deformation" | "transform" | "either";
    modifier?: "ARMATURE" | "CLOTH" | "LIQUID";
  }>;
  inspectExport?: boolean;
};

type SampleObject = { name: string; vertices: number; polygons: number; local_geometry_sha256: string; world_matrix: number[] };
export type MotionEvidence = {
  schema_version: number;
  source_sha256: string;
  frames: number[];
  samples: Array<{ frame: number; objects: SampleObject[] }>;
  modifiers: Record<string, Array<{
    type: string; enabled: boolean; domain_type?: string; cache_type?: string;
    baked?: boolean; baked_data?: boolean; baked_mesh?: boolean; use_mesh?: boolean;
    frame_start?: number; frame_end?: number;
    cache_files?: { nonempty_files: number; truncated: boolean };
  }>>;
};

// Missing, malformed or incomplete evidence must never become a passing result.
export function assessMotionEvidence(requirement: MotionRequirement, evidence: unknown, exported = false) {
  const checks: Array<{ id: string; passed: boolean; detail: string }> = [];
  const add = (id: string, passed: boolean, detail: string) => checks.push({id, passed, detail});
  const report = evidence as MotionEvidence | null;
  const valid = report?.schema_version === 1 && /^[a-f0-9]{64}$/.test(report?.source_sha256 ?? "") &&
    JSON.stringify(report?.frames) === JSON.stringify(requirement.frames) &&
    Array.isArray(report?.samples) && report.samples.length === requirement.frames.length &&
    report.samples.every((s, i) => s?.frame === requirement.frames[i] && Array.isArray(s?.objects));
  add("sample_coverage", Boolean(valid), "Exact requested frames and source hash; sampled change is not motion quality.");
  if (!valid) return {passed: false, checks};
  for (const target of requirement.targets) {
    const samples = report!.samples.map(s => s.objects.filter(o => o?.name === target.object));
    const complete = samples.every(s => s.length === 1 && Number.isInteger(s[0].vertices) && s[0].vertices > 0 &&
      Number.isInteger(s[0].polygons) && s[0].polygons > 0 && /^[a-f0-9]{64}$/.test(s[0].local_geometry_sha256) &&
      Array.isArray(s[0].world_matrix) && s[0].world_matrix.length === 16 && s[0].world_matrix.every(Number.isFinite));
    add(`${target.object}:geometry`, complete, "Nonempty finite evaluated mesh at every requested sample.");
    if (!complete) continue;
    const shapes = new Set(samples.map(s => `${s[0].vertices}:${s[0].polygons}:${s[0].local_geometry_sha256}`));
    const transforms = new Set(samples.map(s => JSON.stringify(s[0].world_matrix)));
    const changed = target.change === "deformation" ? shapes.size > 1 : target.change === "transform" ? transforms.size > 1 : shapes.size > 1 || transforms.size > 1;
    add(`${target.object}:change`, changed, `${shapes.size} local geometry states; ${transforms.size} transforms. Expected ${target.change}.`);
    if (target.modifier && !exported) {
      const modifiers = report!.modifiers?.[target.object];
      const match = Array.isArray(modifiers) && modifiers.some(mod => {
        if (!mod || mod.enabled !== true) return false;
        if (target.modifier === "ARMATURE") return mod.type === "ARMATURE";
        const covers = Number.isInteger(mod.frame_start) && Number.isInteger(mod.frame_end) &&
          mod.frame_start! <= requirement.frames[0] && mod.frame_end! >= requirement.frames.at(-1)!;
        if (target.modifier === "CLOTH") return mod.type === "CLOTH" && mod.baked === true && covers;
        return mod.type === "FLUID" && mod.domain_type === "LIQUID" && ["MODULAR", "ALL"].includes(mod.cache_type ?? "") &&
          mod.baked_data === true && mod.baked_mesh === true && mod.use_mesh === true && covers &&
          (mod.cache_files?.nonempty_files ?? 0) > 0 && mod.cache_files?.truncated === false;
      });
      add(`${target.object}:setup`, Boolean(match), `Enabled ${target.modifier} setup; simulations require bake metadata and interval coverage.`);
    }
  }
  return {passed: checks.every(c => c.passed), checks};
}
