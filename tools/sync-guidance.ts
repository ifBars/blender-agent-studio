import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const plugin = resolve(import.meta.dir, "../plugins/blender-agent-studio");
const guidance = readFileSync(join(plugin, "references/astra-workflow.md"), "utf8");
for (const skill of readdirSync(join(plugin, "skills"), { withFileTypes: true })) {
  if (!skill.isDirectory()) continue;
  const directory = join(plugin, "skills", skill.name, "references");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "astra-workflow.md"), guidance);
}
console.log("Bundled shared guidance with each independently installable skill.");
