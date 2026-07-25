import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const marketplacePath = join(root, ".agents", "plugins", "marketplace.json");
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

if (marketplace.name !== "blender-agent-studio") {
  throw new Error("Marketplace name must be blender-agent-studio");
}
if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
  throw new Error("Marketplace must contain exactly one plugin");
}

const entry = marketplace.plugins[0];
const relativePluginPath = entry.source?.path;
if (typeof relativePluginPath !== "string") {
  throw new Error("Marketplace plugin source path is missing");
}

const pluginRoot = resolve(root, relativePluginPath);
const manifestPath = join(pluginRoot, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.name !== entry.name || manifest.name !== "blender-agent-studio") {
  throw new Error("Plugin names are not aligned");
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
  throw new Error(`Invalid semantic version: ${manifest.version}`);
}

for (const field of ["composerIcon", "logo"]) {
  const value = manifest.interface?.[field];
  if (typeof value !== "string" || !existsSync(resolve(pluginRoot, value))) {
    throw new Error(`Missing interface asset: ${field}`);
  }
}

for (const skillEntry of readdirSync(join(pluginRoot, "skills"), {
  withFileTypes: true,
})) {
  if (!skillEntry.isDirectory()) continue;
  const skillPath = join(pluginRoot, "skills", skillEntry.name, "SKILL.md");
  if (!existsSync(skillPath)) {
    throw new Error(`Missing SKILL.md for ${skillEntry.name}`);
  }
  const text = readFileSync(skillPath, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const name = match?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (name !== skillEntry.name) {
    throw new Error(`Skill name mismatch: ${skillEntry.name} != ${name}`);
  }
}

console.log(`Validated ${manifest.name} ${manifest.version}`);
