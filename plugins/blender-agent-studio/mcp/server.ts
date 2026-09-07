import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPolyHavenClient } from "../skills/blender-rendering-workflow/scripts/poly-haven.ts";
import {
  readJsonFile,
  resolveBlenderExecutable,
  runBlender,
} from "../scripts/blender-process.ts";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validationScripts = join(
  pluginRoot,
  "skills",
  "blender-asset-validation",
  "scripts",
);
const authoredRenderer = join(pluginRoot, "skills/blender-rendering-workflow/scripts/render_scene.py");
const polyHaven = createPolyHavenClient();

const server = new McpServer({
  name: "blender-agent-studio",
  version: JSON.parse(await readFile(join(pluginRoot, ".codex-plugin/plugin.json"), "utf8")).version,
});

function result(output: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output as Record<string, unknown>,
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

server.registerTool(
  "blender_version",
  {
    title: "Blender version",
    description:
      "Verify the configured Blender executable and return its exact build fingerprint.",
    inputSchema: z.object({
      blenderPath: z.string().optional(),
    }),
  },
  async ({ blenderPath }) => {
    try {
      const executable = resolveBlenderExecutable(blenderPath);
      const proc = Bun.spawn([executable, "--version"], {
        stdout: "pipe",
        stderr: "pipe",
        windowsHide: true,
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return result({ executable, exitCode, stdout, stderr });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_inspect_asset",
  {
    title: "Inspect Blender asset",
    description:
      "Inspect a .blend, .glb, .gltf, .fbx, or .obj in Blender 5.2 and write machine-readable geometry, hierarchy, material, and animation metrics.",
    inputSchema: z.object({
      assetPath: z.string(),
      outputJson: z.string(),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1_000).max(1_800_000).default(300_000),
    }),
  },
  async ({ assetPath, outputJson, blenderPath, timeoutMs }) => {
    try {
      const resolvedOutput = resolve(outputJson);
      await mkdir(dirname(resolvedOutput), { recursive: true });
      const process = await runBlender({
        blenderPath,
        scriptPath: join(validationScripts, "inspect_asset.py"),
        scriptArgs: [
          "--input",
          resolve(assetPath),
          "--output",
          resolvedOutput,
        ],
        timeoutMs,
      });
      const metrics =
        process.exitCode === 0 && !process.timedOut && existsSync(resolvedOutput)
          ? await readJsonFile(resolvedOutput)
          : null;
      return { ...result({ process, outputJson: resolvedOutput, metrics }),
        isError: process.exitCode !== 0 || process.timedOut };
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_render_evidence",
  {
    title: "Render Blender evidence",
    description:
      "Render standardized multiview evidence and a contact sheet for a Blender asset using fixed cameras and lighting.",
    inputSchema: z.object({
      assetPath: z.string(),
      outputDir: z.string(),
      resolution: z.number().int().min(128).max(1024).default(384),
      presentation: z.enum(["auto", "neutral", "dark", "light"]).default("auto")
        .describe("Adaptive contrast by default; pin a studio preset for repeatable comparisons."),
      animationFrames: z.array(z.number().int().min(0)).max(12).default([]),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1_000).max(1_800_000).default(600_000),
    }),
  },
  async ({
    assetPath,
    outputDir,
    resolution,
    presentation,
    animationFrames,
    blenderPath,
    timeoutMs,
  }) => {
    try {
      const resolvedOutput = resolve(outputDir);
      await mkdir(resolvedOutput, { recursive: true });
      const args = [
        "--input",
        resolve(assetPath),
        "--output-dir",
        resolvedOutput,
        "--resolution",
        String(resolution),
        "--presentation",
        presentation,
      ];
      if (animationFrames.length) {
        args.push("--frames", animationFrames.join(","));
      }
      const process = await runBlender({
        blenderPath,
        scriptPath: join(validationScripts, "render_evidence.py"),
        scriptArgs: args,
        timeoutMs,
      });
      return { ...result({
        process,
        outputDir: resolvedOutput,
        manifest: process.exitCode === 0 && !process.timedOut && existsSync(join(resolvedOutput, "evidence.json"))
          ? await readJsonFile(join(resolvedOutput, "evidence.json"))
          : null,
      }), isError: process.exitCode !== 0 || process.timedOut };
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "blender_render_scene",
  {
    title: "Render authored Blender scene",
    description: "Preflight or render a .blend using its authored cameras, lights, world, volumes and color management. Use for interiors, cinematic lighting and final beauty images; use render_evidence for standardized geometry views. Never saves the source. Output directory must be new or empty. Returns first rendered PNG inline.",
    inputSchema: z.object({
      assetPath: z.string(), outputDir: z.string(),
      inspectOnly: z.boolean().default(false).describe("List cameras, lights, volumes, missing image/library dependencies and settings without rendering."),
      scene: z.string().optional(),
      cameras: z.array(z.string()).max(6).default([]).describe("Exact existing camera names; omitted uses active camera. At most 12 camera/frame combinations."),
      frames: z.array(z.number().int().min(-1_048_574).max(1_048_574)).max(12).default([]),
      maxEdge: z.number().int().min(128).max(4096).default(1280),
      samples: z.number().int().min(1).max(4096).default(64).describe("Cycles sample cap; does not raise authored samples."),
      device: z.enum(["auto", "cpu", "OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"]).default("auto"),
      timeLimitSeconds: z.number().int().min(1).max(1800).default(120).describe("Per-render Cycles time limit; whole process also bounded by timeoutMs."),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1000).max(1_800_000).default(600_000),
    }),
  },
  async ({assetPath, outputDir, inspectOnly, scene, cameras, frames, maxEdge, samples, device, timeLimitSeconds, blenderPath, timeoutMs}) => {
    try {
      if (Math.max(1, cameras.length) * Math.max(1, frames.length) > 12) {
        throw new Error("At most 12 camera/frame combinations are allowed");
      }
      const resolvedOutput = resolve(outputDir);
      const args = ["--input", resolve(assetPath), "--output-dir", resolvedOutput,
        "--max-edge", String(maxEdge), "--samples", String(samples), "--device", device,
        "--time-limit", String(timeLimitSeconds)];
      if (inspectOnly) args.push("--inspect-only");
      if (scene) args.push(`--scene=${scene}`);
      for (const camera of cameras) args.push(`--camera=${camera}`);
      if (frames.length) args.push("--frames", ...frames.map(String));
      const process = await runBlender({blenderPath, scriptPath: authoredRenderer, scriptArgs: args, timeoutMs});
      // Do not return a manifest left by an older invocation after a failure.
      const manifest = process.exitCode === 0 && !process.timedOut
        ? await readJsonFile(join(resolvedOutput, "render-manifest.json")) as Record<string, any>
        : null;
      const response = result({process, outputDir: resolvedOutput, manifest});
      const content: Array<any> = [...response.content];
      if (manifest?.renders?.length) {
        const png = await readFile(manifest.renders[0].path);
        if (png.length <= 10_000_000) content.push({type: "image", mimeType: "image/png", data: png.toString("base64")});
        else content.push({type: "text", text: `PNG exceeds the 10 MB inline limit; open the rendered image at ${manifest.renders[0].path}`});
      }
      return {...response, content, isError: process.exitCode !== 0 || process.timedOut};
    } catch (error) { return errorResult(error); }
  },
);

server.registerTool("blender_search_polyhaven_assets", {
  title: "Search Poly Haven assets",
  description: "Search high-quality CC0 PBR textures or HDRIs by words such as linen, oak or morning. Powered by Poly Haven. Returns asset IDs for the bounded download tool; no files are downloaded by search.",
  inputSchema: z.object({query: z.string().trim().min(1).max(120), assetType: z.enum(["textures", "hdris"]).default("textures"), limit: z.number().int().min(1).max(20).default(8)}),
}, async ({query, assetType, limit}) => {
  try {return result(await polyHaven.search(query, assetType, limit));} catch(error) {return errorResult(error);}
});

server.registerTool("blender_download_polyhaven_asset", {
  title: "Download Poly Haven texture or HDRI",
  description: "Download a selected CC0 texture map set or HDRI at an explicit resolution into a new/empty directory. Powered by Poly Haven. Verifies upstream checksums and records local paths, source, license, map color spaces and SHA-256 hashes. Does not download models or execute files.",
  inputSchema: z.object({
    assetId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,127}$/), assetType: z.enum(["textures", "hdris"]).default("textures"),
    resolution: z.enum(["1k", "2k", "4k", "8k"]).default("4k"),
    maps: z.array(z.enum(["diffuse", "roughness", "normal", "displacement", "metallic", "ao"])).min(1).max(6).default(["diffuse", "roughness", "normal"]),
    outputDir: z.string(), maxBytes: z.number().int().min(1_000_000).max(1_024_000_000).default(512_000_000),
  }),
}, async (options) => {
  try {return result(await polyHaven.download(options));} catch(error) {return errorResult(error);}
});

await server.connect(new StdioServerTransport());
