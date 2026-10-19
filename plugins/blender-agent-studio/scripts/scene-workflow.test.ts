import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Instruction-contract regressions only: these do not measure generated art quality.
const plugin = resolve(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(plugin, path), "utf8");
const modeling = read("skills/blender-modeling-workflow/SKILL.md");
const sceneRaw = read("skills/blender-modeling-workflow/references/whole-scene-workflow.md");
const guidanceRaw = read("references/astra-workflow.md");

const compact = (text: string) => text.replace(/\s+/g, " ");
const scene = compact(sceneRaw);
const guidance = compact(guidanceRaw);

test("normal modeling routes complex scenes to the sustained construction loop", () => {
  const target = modeling.match(/\]\((references\/whole-scene-workflow\.md)\)/)?.[1];
  expect(target).toBeDefined();
  expect(read(`skills/blender-modeling-workflow/${target}`)).toBe(sceneRaw);
  expect(modeling).toContain("This is normal creation, not an opt-in second pass");
  for (const milestone of ["Block out the whole space", "hero and secondary families", "Integrate materials and lighting", "Inspect final hero"]) {
    expect(scene).toContain(milestone);
  }
});

test("hour-scale effort has scope, stop, and host limits without time padding", () => {
  expect(guidance).toContain("Plan for hour-long work where the scope warrants it");
  expect(guidance).toContain("Respect explicit user time limits, approval gates, and stop requests");
  expect(guidance).toContain("Never idle, repeat unchanged renders, or add filler geometry");
  expect(guidance).toContain("a skill cannot keep the host alive");
  expect(scene).toContain("Finish sooner if gates pass");
  expect(scene).toContain("An explicit user time limit wins");
});

test("scene checkpoints tie resumable source, jobs, and evidence to a revision", () => {
  for (const field of ["work_state.md", "source revision/hash", "pending jobs", "next concrete source change", "exact resume command"]) {
    expect(scene).toContain(field);
  }
  expect(scene).toContain("files/source revision and pending job status");
  expect(scene).toContain("Invalidate evidence affected by new edits");
});

test("finish gates require multiview defect repairs and honest partial delivery", () => {
  for (const view of ["hero", "reverse", "secondary-area", "close-up"]) expect(scene).toContain(view);
  for (const gate of ["highest-impact defect", "fix durable source", "retain/revert decision", "Replace visible placeholder shapes", "unclear is not a pass", "scene/checkpoint"]) {
    expect(scene).toContain(gate);
  }
  expect(scene).toContain("static workflow tests cannot prove generated scene quality");
});

test("independently installable skills retain identical shared effort guidance", () => {
  const skills = readdirSync(join(plugin, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory());
  expect(skills.length).toBeGreaterThan(0);
  for (const skill of skills) {
    expect(read(`skills/${skill.name}/references/astra-workflow.md`)).toBe(guidanceRaw);
  }
});
