import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const API = "https://api.polyhaven.com";
const CREDIT = "Powered by Poly Haven";
const USER_AGENT = "Blender-Agent-Studio/0.6 (+https://github.com/ifBars/blender-agent-studio)";
export const MAPS = { diffuse: "Diffuse", roughness: "Rough", normal: "nor_gl", displacement: "Displacement", metallic: "Metal", ao: "AO" } as const;
type MapName = keyof typeof MAPS;
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

async function bytes(response: Response, limit: number): Promise<Buffer> {
  if (!response.ok) throw new Error(`Poly Haven returned HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length"));
  if (length > limit) throw new Error("Download exceeds byte limit");
  if (!response.body) throw new Error("Empty response body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      total += part.value.length;
      if (total > limit) throw new Error("Download exceeds byte limit");
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks, total);
}

export function createPolyHavenClient(fetcher: Fetcher = fetch) {
  const cache = new Map<string, {time: number; value: any}>();
  async function metadata(path: string) {
    const cached = cache.get(path);
    if (cached && Date.now() - cached.time < 1_800_000) return cached.value;
    const response = await fetcher(API + path, {headers: {"User-Agent": USER_AGENT}, redirect: "error", signal: AbortSignal.timeout(30_000)});
    const value = JSON.parse((await bytes(response, 16_000_000)).toString("utf8"));
    cache.set(path, {time: Date.now(), value});
    return value;
  }
  return {
    async search(query: string, assetType: "textures" | "hdris", limit = 8) {
      const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const assets = await metadata(`/assets?t=${assetType}`);
      const matches = Object.entries(assets).map(([id, raw]) => {
        const a = raw as any;
        const words = `${id} ${a.name ?? ""} ${(a.tags ?? []).join(" ")} ${(a.categories ?? []).join(" ")}`.toLowerCase();
        return {id, name: a.name, categories: a.categories, page: `https://polyhaven.com/a/${id}`,
          score: terms.reduce((n, term) => n + (words.includes(term) ? 1 : 0), 0)};
      }).filter(a => a.score === terms.length).sort((a,b) => a.id.localeCompare(b.id)).slice(0, limit);
      return {provider: "Poly Haven", credit: CREDIT, assetType, query, assets: matches,
        note: "Assets are CC0. Search metadata is descriptive; inspect materials at the intended scale. Download maps with blender_download_polyhaven_asset."};
    },
    async download(options: {assetId: string; assetType: "textures" | "hdris"; resolution: "1k" | "2k" | "4k" | "8k";
      maps: MapName[]; outputDir: string; maxBytes?: number}) {
      if (!/^[a-z0-9][a-z0-9_-]{0,127}$/.test(options.assetId)) throw new Error("Invalid Poly Haven asset ID");
      const maxBytes = options.maxBytes ?? 512_000_000;
      const output = resolve(options.outputDir);
      await mkdir(output, {recursive: true});
      if ((await readdir(output)).length) throw new Error("Output directory must be new or empty; reuse an existing asset manifest instead of downloading twice");
      const files = await metadata(`/files/${options.assetId}`);
      const keys = options.assetType === "hdris" ? ["hdri"] : [...new Set(options.maps)];
      const planned = keys.map(map => {
        const key = map === "hdri" ? "hdri" : MAPS[map as MapName];
        const formats = files[key]?.[options.resolution];
        // Maps remain separate; normals use the OpenGL convention. Prefer PNG
        // for data maps, JPEG for color, and Radiance HDR for environments.
        const ext = map === "hdri" ? "hdr" : map === "diffuse" ? "jpg" : formats?.png ? "png" : "jpg";
        const entry = formats?.[ext];
        if (!entry) throw new Error(`${map} ${options.resolution} ${ext} is unavailable for ${options.assetId}; no resolution fallback was applied`);
        const url = new URL(entry.url);
        if (url.protocol !== "https:" || url.hostname !== "dl.polyhaven.org" || url.username || url.password) throw new Error("Unexpected Poly Haven download host");
        if (!Number.isSafeInteger(entry.size) || entry.size <= 0 || !/^[a-f0-9]{32}$/i.test(entry.md5)) throw new Error("Invalid file size or hash metadata");
        return {map, url: url.href, size: entry.size as number, md5: entry.md5 as string, file: `${options.assetId}_${map}_${options.resolution}.${ext}`,
          colorSpace: map === "diffuse" ? "sRGB" : map === "hdri" ? "Linear" : "Non-Color", normalConvention: map === "normal" ? "OpenGL" : undefined};
      });
      if (planned.reduce((n,f) => n+f.size,0) > maxBytes) throw new Error("Requested asset set exceeds maxBytes; select fewer maps or a lower resolution");
      const manifest: any = {schemaVersion: 1, provider: "Poly Haven", credit: CREDIT, license: "CC0",
        licenseUrl: "https://polyhaven.com/license", source: `https://polyhaven.com/a/${options.assetId}`,
        assetId: options.assetId, assetType: options.assetType, resolution: options.resolution,
        status: "downloading", files: []};
      const manifestPath = join(output, "asset-manifest.json");
      const save = () => writeFile(manifestPath, JSON.stringify(manifest,null,2));
      await save();
      try {
        for (const file of planned) {
          const response = await fetcher(file.url, {headers: {"User-Agent": USER_AGENT}, redirect: "error", signal: AbortSignal.timeout(120_000)});
          const data = await bytes(response, file.size);
          if (data.length !== file.size || createHash("md5").update(data).digest("hex") !== file.md5.toLowerCase()) throw new Error(`Size or checksum mismatch: ${file.file}`);
          const path = join(output, file.file);
          await writeFile(path, data, {flag: "wx"});
          manifest.files.push({...file, path, sha256: createHash("sha256").update(data).digest("hex")});
          await save();
        }
        manifest.status = "complete";
      } catch (error) {
        manifest.status = "failed"; manifest.error = String(error); throw error;
      } finally { await save(); }
      return {manifestPath, manifest, guidance: "Use diffuse as sRGB; roughness, normal and displacement as data. Connect OpenGL normals through a Normal Map node. Set physical texture scale and pack images before handoff. Resolution alone does not ensure realism."};
    },
  };
}
