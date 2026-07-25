import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  readJsonFile,
  resolveBlenderExecutable,
  runBlender,
} from "../../../scripts/blender-process.ts";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function canonicalMetrics(value: unknown): unknown {
  const copy = structuredClone(value) as Record<string, unknown>;
  delete copy.input;
  return copy;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function main(): Promise<void> {
  const assetArg = argument("--asset");
  const outputArg = argument("--output");
  if (!assetArg || !outputArg) {
    throw new Error("--asset and --output are required");
  }
  const asset = resolve(assetArg);
  const output = resolve(outputArg);
  if (!existsSync(asset)) {
    throw new Error(`Asset does not exist: ${asset}`);
  }
  if (existsSync(output)) {
    throw new Error(`Output already exists: ${output}`);
  }
  await mkdir(join(output, "mcp"), { recursive: true });
  await mkdir(join(output, "cli"), { recursive: true });

  const pluginRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
  );
  const inspectScript = join(
    pluginRoot,
    "skills",
    "blender-asset-validation",
    "scripts",
    "inspect_asset.py",
  );
  const blenderPath = resolveBlenderExecutable(argument("--blender"));

  const cliOutput = join(output, "cli", "metrics.json");
  const cliStarted = performance.now();
  const cliProcess = await runBlender({
    blenderPath,
    scriptPath: inspectScript,
    scriptArgs: ["--input", asset, "--output", cliOutput],
    cwd: dirname(asset),
    timeoutMs: 300_000,
  });
  const cliDurationMs = Math.round(performance.now() - cliStarted);
  const cliMetrics =
    cliProcess.exitCode === 0 ? await readJsonFile(cliOutput) : null;

  const client = new Client({
    name: "blender-agent-studio-mcp-benchmark",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: "bun",
    args: [join(pluginRoot, "mcp", "server.ts")],
    cwd: pluginRoot,
    stderr: "pipe",
  });
  await client.connect(transport);
  const mcpOutput = join(output, "mcp", "metrics.json");
  const mcpStarted = performance.now();
  const mcpResponse = await client.callTool({
    name: "blender_inspect_asset",
    arguments: {
      assetPath: asset,
      outputJson: mcpOutput,
      blenderPath,
    },
  });
  const mcpDurationMs = Math.round(performance.now() - mcpStarted);
  await client.close();
  const mcpMetrics = existsSync(mcpOutput) ? await readJsonFile(mcpOutput) : null;

  const cliCanonical = canonicalMetrics(cliMetrics);
  const mcpCanonical = canonicalMetrics(mcpMetrics);
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    asset,
    blenderPath,
    cli: {
      durationMs: cliDurationMs,
      exitCode: cliProcess.exitCode,
      metricsHash: hash(cliCanonical),
    },
    mcp: {
      durationMs: mcpDurationMs,
      isError: mcpResponse.isError ?? false,
      metricsHash: hash(mcpCanonical),
    },
    equivalentMetrics: JSON.stringify(cliCanonical) === JSON.stringify(mcpCanonical),
    overheadMs: mcpDurationMs - cliDurationMs,
    interpretation:
      "The MCP wraps the same deterministic evaluator. Equivalent metrics validate transport correctness; this test does not claim a modeling-quality gain.",
  };
  await writeFile(
    join(output, "mcp-benchmark.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  process.stdout.write(`${join(output, "mcp-benchmark.json")}\n`);
}

await main();
