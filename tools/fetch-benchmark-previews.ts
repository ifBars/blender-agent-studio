import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export function validatePreviewPaths(entries: string[]): void {
  if (!entries.length || entries.some(path => !path.startsWith("benchmarks/") ||
      path.includes("\\") || path.split("/").some(part => part === ".." || part === ".") ||
      !/^benchmarks\/(?:[a-zA-Z0-9_.-]+\/)*(?:[a-zA-Z0-9_.-]+\.(?:png|json))?$/.test(path)))
    throw new Error("Archive contains an unexpected preview path");
}

async function run(args: string[]): Promise<string> {
  const process = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", windowsHide: true });
  const [stdout, stderr, code] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  if (code !== 0) throw new Error(stderr || `${args[0]} exited ${code}`);
  return stdout;
}

export async function fetchBenchmarkPreviews(root = resolve(import.meta.dir, "..")): Promise<void> {
  const manifest = JSON.parse(await readFile(join(root, "site/benchmark-previews.json"), "utf8"));
  const response = await fetch(manifest.url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Gallery download failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== manifest.sha256)
    throw new Error("Gallery checksum mismatch; refusing to extract");
  const temporary = await mkdtemp(join(tmpdir(), "bas-gallery-"));
  try {
    const archive = join(temporary, "gallery.tar.gz");
    await writeFile(archive, bytes);
    const entries = (await run(["tar", "-tzf", archive])).trim().split(/\r?\n/);
    validatePreviewPaths(entries);
    const staging = join(temporary, "extracted");
    await mkdir(staging);
    await run(["tar", "-xzf", archive, "-C", staging]);
    const datasetPath = manifest.dataset ?? "benchmarks/spatial-pilot.json";
    validatePreviewPaths([datasetPath]);
    const dataset = JSON.parse(await readFile(join(staging, datasetPath), "utf8"));
    if (dataset.pairs.length !== manifest.pairs || entries.filter(path => path.endsWith(".png")).length !== manifest.images)
      throw new Error("Gallery contents do not match the pinned manifest");
    for (const pair of dataset.pairs) for (const condition of dataset.schemaVersion === 2 ? [pair.vanilla, pair.plugin] : [pair.current, pair.guided]) {
      for (const [images, hashes] of [[condition.images, condition.imageHashes], [condition.originalImages ?? {}, condition.originalImageHashes ?? {}]])
      for (const [view, path] of Object.entries(images) as Array<[string, string]>) {
        validatePreviewPaths([path]);
        const image = await readFile(join(staging, path));
        if (createHash("sha256").update(image).digest("hex") !== hashes[view])
          throw new Error(`Image checksum mismatch: ${path}`);
      }
    }
    const destination = join(root, "site/public");
    await mkdir(destination, { recursive: true });
    await run(["tar", "-xzf", archive, "-C", destination]);
    console.log(`Verified and restored ${manifest.pairs} comparisons and ${manifest.images} images`);
  } finally {
    if (dirname(resolve(temporary)) !== resolve(tmpdir()) || !basename(temporary).startsWith("bas-gallery-"))
      throw new Error("Unexpected cleanup path");
    await rm(temporary, { recursive: true, force: true });
  }
}

if (import.meta.main) await fetchBenchmarkPreviews();
