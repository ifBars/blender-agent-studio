import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { assertCompleteGallery } from "./gallery-matrix";
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
assertCompleteGallery(data.pairs);
if (data.schemaVersion !== 2 || data.experiment !== "vanilla_vs_plugin") throw new Error("Wrong experiment");
if (published && hash(bytes) !== hash(await readFile(join(root, prefix, "comparison.json")))) throw new Error("Published dataset differs");
const jobs: Array<{ path: string; expected: string; resolution: number }> = [];
for (const pair of data.pairs) {
  if (pair.vanilla.executionMode !== "baseline" || pair.plugin.executionMode !== "skills" || pair.vanilla.skillFingerprint || !pair.plugin.skillFingerprint || pair.vanilla.guidanceHash || pair.plugin.guidanceHash)
    throw new Error(`Invalid conditions: ${pair.id}`);
  if (pair.votes.baseline + pair.votes.candidate + pair.votes.tie !== pair.judgeCount) throw new Error(`Incomplete votes: ${pair.id}`);
  for (const condition of [pair.vanilla, pair.plugin]) for (const [images, hashes, resolution] of [[condition.images, condition.imageHashes, 1536], [condition.originalImages, condition.originalImageHashes, 384], [condition.rawImages ?? {}, condition.rawImageHashes ?? {}, 384]] as const)
    for (const [view, path] of Object.entries(images) as Array<[string, string]>) {
      if (!path.startsWith(`${prefix}/`)) throw new Error("Image outside self-contained archive");
      jobs.push({ path, expected: hashes[view], resolution });
    }
}
if (jobs.length !== 656 || new Set(jobs.map(j => j.path)).size !== jobs.length) throw new Error(`Unexpected image count: ${jobs.length}`);
for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map(async job => {
  const image = await get(job.path), view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  if (hash(image) !== job.expected || view.getUint32(16) !== job.resolution || view.getUint32(20) !== job.resolution) throw new Error(`Image differs: ${job.path}`);
}));
console.log(JSON.stringify({ published, pairs: data.pairs.length, images: jobs.length, datasetSha256: hash(bytes), passed: true }, null, 2));
