import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { assertPublishedGallery } from "./gallery-matrix";
import { validatePreviewPaths } from "./fetch-benchmark-previews";

const prefix = "benchmarks/gallery-matrix", root = resolve(import.meta.dir, "../site/public");
const published = process.argv.includes("--published"), base = "https://ifbars.github.io/blender-agent-studio/";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const get = async (path: string): Promise<Uint8Array> => {
  validatePreviewPaths([path]);
  if (!published) return readFile(join(root, path));
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};
const bytes = await get(`${prefix}/comparison.json`), data = JSON.parse(new TextDecoder().decode(bytes));
assertPublishedGallery(data.pairs);
if (data.schemaVersion !== 2 || data.experiment !== "vanilla_vs_plugin") throw new Error("Wrong experiment");
if (published && hash(bytes) !== hash(await readFile(join(root, prefix, "comparison.json")))) throw new Error("Published dataset differs");
const jobs = new Map<string,{ path: string; expected: string; dimensions: number[] }>();
for (const pair of data.pairs) {
  const shared = pair.resourcePolicy?.concurrency === 1 && pair.resourcePolicy?.cpuHardCapPercent === 20 ? pair.sharedResourceGuidanceHash : undefined;
  if (pair.vanilla.executionMode !== "baseline" || pair.plugin.executionMode !== "skills" || pair.vanilla.skillFingerprint || !pair.plugin.skillFingerprint || (pair.vanilla.guidanceHash && pair.vanilla.guidanceHash !== shared) || (pair.plugin.guidanceHash && pair.plugin.guidanceHash !== shared))
    throw new Error(`Invalid conditions: ${pair.id}`);
  if (pair.votes.baseline + pair.votes.candidate + pair.votes.tie !== pair.judgeCount) throw new Error(`Incomplete votes: ${pair.id}`);
  for (const condition of [pair.vanilla, pair.plugin]) for (const [images, hashes, dimensions, fallback] of [[condition.images, condition.imageHashes, condition.imageDimensions ?? {}, 1536], [condition.originalImages, condition.originalImageHashes, condition.originalImageDimensions ?? {}, 384], [condition.rawImages ?? {}, condition.rawImageHashes ?? {}, condition.rawImageDimensions ?? {}, 384]] as const)
    for (const [view, path] of Object.entries(images) as Array<[string, string]>) {
      if (!path.startsWith(`${prefix}/`)) throw new Error("Image outside self-contained archive");
      const job = {path, expected:hashes[view], dimensions:dimensions[view] ?? [fallback,fallback]};
      if (jobs.has(path) && JSON.stringify(jobs.get(path)) !== JSON.stringify(job)) throw new Error(`Conflicting image metadata: ${path}`);
      jobs.set(path,job);
    }
}
const manifest = JSON.parse(await readFile(resolve(import.meta.dir,"../site/benchmark-previews.json"),"utf8"));
if (data.pairs.length !== manifest.pairs || jobs.size !== manifest.images) throw new Error("Gallery counts differ from the pinned manifest");
const entries = [...jobs.values()];
for (let i = 0; i < entries.length; i += 8) await Promise.all(entries.slice(i, i + 8).map(async job => {
  const image = await get(job.path), view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  if (hash(image) !== job.expected || view.getUint32(16) !== job.dimensions[0] || view.getUint32(20) !== job.dimensions[1]) throw new Error(`Image differs: ${job.path}`);
}));
console.log(JSON.stringify({ published, pairs: data.pairs.length, images: jobs.size, datasetSha256: hash(bytes), passed: true }, null, 2));
