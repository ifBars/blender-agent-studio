import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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

const server = new McpServer({
  name: "blender-agent-studio",
  version: "0.1.0",
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
        process.exitCode === 0 && existsSync(resolvedOutput)
          ? await readJsonFile(resolvedOutput)
          : null;
      return result({ process, outputJson: resolvedOutput, metrics });
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
      animationFrames: z.array(z.number().int().min(0)).max(12).default([]),
      blenderPath: z.string().optional(),
      timeoutMs: z.number().int().min(1_000).max(1_800_000).default(600_000),
    }),
  },
  async ({
    assetPath,
    outputDir,
    resolution,
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
      return result({
        process,
        outputDir: resolvedOutput,
        manifest: existsSync(join(resolvedOutput, "evidence.json"))
          ? await readJsonFile(join(resolvedOutput, "evidence.json"))
          : null,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
);

await server.connect(new StdioServerTransport());
