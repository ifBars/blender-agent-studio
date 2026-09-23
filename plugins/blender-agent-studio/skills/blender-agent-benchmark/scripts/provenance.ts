import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BenchmarkTask } from "./tasks.ts";

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
export const taskFingerprint = (task: BenchmarkTask) => sha256(JSON.stringify(task));

export async function evaluatorFingerprint() {
  const root=resolve(import.meta.dir,"../../..");
  const files=["scripts/blender-process.ts",
    ...["run_benchmark.ts","score.ts","motion-evidence.ts"].map(f=>`skills/blender-agent-benchmark/scripts/${f}`),
    ...["inspect_asset.py","inspect_motion.py","render_evidence.py","evidence_settings.py"].map(f=>`skills/blender-asset-validation/scripts/${f}`)];
  const hash=createHash("sha256");
  for(const file of files) {hash.update(file);hash.update(await readFile(join(root,file)));}
  return hash.digest("hex");
}

export async function readReferenceInput(path:string) {
  if((await stat(path)).size > 32*1024*1024) throw new Error("Reference PNG exceeds 32 MiB");
  const data=await readFile(path);
  if(!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Reference must be a PNG: ${path}`);
  return {data,hash:sha256(data)};
}

export type RunProvenance = {
  blenderBuild?: string; evaluatorFingerprint?: string; timeoutMinutes?: number; bypassApprovals?: boolean;
  taskFingerprints?: Record<string,string>; referenceHashes?: Record<string,Record<string,string>>;
};

export function provenanceMismatches(baseline:RunProvenance,candidate:RunProvenance,taskIds:string[]) {
  const mismatches:string[]=[];
  for(const field of ["blenderBuild","evaluatorFingerprint","timeoutMinutes","bypassApprovals"] as const) {
    if(baseline[field] === undefined || candidate[field] === undefined) mismatches.push(`missing comparison control: ${field}`);
    else if(baseline[field] !== candidate[field]) mismatches.push(`comparison control differs: ${field}`);
  }
  for(const id of new Set(taskIds)) {
    if(!baseline.taskFingerprints?.[id] || !candidate.taskFingerprints?.[id]) mismatches.push(`missing task fingerprint: ${id}`);
    else if(baseline.taskFingerprints[id] !== candidate.taskFingerprints[id]) mismatches.push(`task fingerprint differs: ${id}`);
    if(JSON.stringify(baseline.referenceHashes?.[id] ?? {}) !== JSON.stringify(candidate.referenceHashes?.[id] ?? {}))
      mismatches.push(`reference inputs differ: ${id}`);
  }
  return mismatches;
}
