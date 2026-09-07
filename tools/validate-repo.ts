import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const marketplacePath = join(root, ".agents", "plugins", "marketplace.json");
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
const rootSkill = readFileSync(join(root, "SKILL.md"), "utf8");
const rootSkillName = rootSkill.match(/^name:\s*(.+)$/m)?.[1]?.trim();

if (rootSkillName !== "blender-agent-studio") {
  throw new Error(`Root skill name mismatch: ${rootSkillName}`);
}
if (!existsSync(join(root, "agents", "openai.yaml"))) {
  throw new Error("Root skill agents/openai.yaml is missing");
}

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
const sharedGuidance = readFileSync(join(pluginRoot, "references/astra-workflow.md"), "utf8");

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
  const bundledGuidance = join(pluginRoot, "skills", skillEntry.name, "references/astra-workflow.md");
  if (!existsSync(bundledGuidance) || readFileSync(bundledGuidance, "utf8") !== sharedGuidance) {
    throw new Error(`Missing or stale guidance for ${skillEntry.name}; run bun tools/sync-guidance.ts`);
  }
  if (!text.includes("](references/astra-workflow.md)")) {
    throw new Error(`Skill must link its bundled guidance: ${skillEntry.name}`);
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const name = match?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (name !== skillEntry.name) {
    throw new Error(`Skill name mismatch: ${skillEntry.name} != ${name}`);
  }
}

const renderer = readFileSync(join(pluginRoot, "skills/blender-asset-validation/scripts/evidence_settings.py"), "utf8");
const runner = readFileSync(join(pluginRoot, "skills/blender-agent-benchmark/scripts/run_benchmark.ts"), "utf8");
const rendererVersion = renderer.match(/EVIDENCE_SETTINGS_VERSION\s*=\s*(\d+)/)?.[1];
const recordedVersion = runner.match(/evidenceSettingsVersion:\s*(\d+)/)?.[1];
if (!rendererVersion || rendererVersion !== recordedVersion) {
  throw new Error("Benchmark manifest must record the current evidence settings version");
}

console.log(`Validated ${manifest.name} ${manifest.version}`);
