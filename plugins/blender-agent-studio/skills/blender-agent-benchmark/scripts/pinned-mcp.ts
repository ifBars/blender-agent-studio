import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

// These feature names are exposed by the supported Codex CLI's features list.
// Explicit skill-file prompts and the pinned MCP are the only condition inputs.
export function hostSkillConfig(roots: string[]): string {
  const paths = new Set<string>();
  const visited = new Set<string>();
  function visit(directory: string) {
    if (!existsSync(directory) || !statSync(directory).isDirectory()) return;
    const canonical = realpathSync(directory);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    const skill = join(directory,"SKILL.md");
    if (existsSync(skill)) {
      paths.add(skill.replaceAll("\\", "/"));
      paths.add(realpathSync(skill).replaceAll("\\", "/"));
      return;
    }
    for (const entry of readdirSync(directory,{withFileTypes:true})) {
      if (["node_modules", ".git", "target", ".tmp"].includes(entry.name)) continue;
      if (entry.isDirectory() || entry.isSymbolicLink()) visit(join(directory,entry.name));
    }
  }
  for (const root of roots) visit(root);
  const config = `skills.config=[${[...paths].sort().map(path => `{path=${JSON.stringify(path)},enabled=false}`).join(",")}]`;
  if (process.platform === "win32" && config.length > 24_000) throw new Error("Host skill exclusions exceed the Windows argument budget; use a clean benchmark account/home before dispatching");
  return config;
}

export function isolatedAgentArgs(): string[] {
  return [
    "--ignore-user-config", "--ignore-rules",
    "--disable", "plugins", "--disable", "memories",
    "-c", "project_doc_max_bytes=0",
    "-c", hostSkillConfig([
      join(process.env.CODEX_HOME ?? join(homedir(),".codex"),"skills"),
      join(homedir(),".agents","skills"),
    ]),
  ];
}

export function pinnedMcpArgs(root: string): string[] {
  const resolved = resolve(root);
  const server = join(resolved, "mcp/server.ts");
  if (!existsSync(server)) throw new Error(`Pinned MCP server is missing: ${server}`);
  return [
    "-c", `mcp_servers.bas_benchmark.command="bun"`,
    "-c", `mcp_servers.bas_benchmark.args=${JSON.stringify([server])}`,
    "-c", `mcp_servers.bas_benchmark.cwd=${JSON.stringify(resolved)}`,
    "-c", "mcp_servers.bas_benchmark.startup_timeout_sec=60",
    "-c", "mcp_servers.bas_benchmark.tool_timeout_sec=1800",
  ];
}

export function sourceFingerprint(root: string): string {
  const hash = createHash("sha256");
  const excluded = new Set(["node_modules", "target", ".git", ".tmp", "__pycache__"]);
  function visit(directory: string, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (excluded.has(entry.name)) continue;
      const relative = prefix + entry.name;
      if (entry.isDirectory()) visit(join(directory, entry.name), relative + "/");
      else if (entry.isFile()) { hash.update(relative + "\0"); hash.update(readFileSync(join(directory,entry.name))); hash.update("\0"); }
    }
  }
  visit(root);
  return hash.digest("hex");
}

export async function preflightPinnedMcp(root: string) {
  pinnedMcpArgs(root);
  const client = new Client({name:"bas-benchmark-preflight",version:"1"});
  try {
    await client.connect(new StdioClientTransport({command:"bun",args:[join(root,"mcp/server.ts")],cwd:root,stderr:"pipe"}));
    const tools = (await client.listTools()).tools.map(tool => tool.name).sort();
    if (!tools.includes("blender_inspect_asset")) throw new Error("Pinned MCP is missing blender_inspect_asset");
    return {serverPath:join(root,"mcp/server.ts"),version:client.getServerVersion(),tools};
  } finally { await client.close(); }
}
