import { expect, test } from "bun:test";
import { assertVanillaPluginConditions } from "../../tools/comparison-contract";
const vanilla = { executionMode: "baseline", model: "gpt-6-astra", reasoning: "medium" };
const plugin = { ...vanilla, executionMode: "skills", skillRoot: "/pinned/plugin", skillFingerprint: "hash" };

test("gallery accepts actual vanilla versus pinned plugin execution", () => {
  expect(() => assertVanillaPluginConditions(vanilla, plugin)).not.toThrow();
});
test("gallery rejects relabeled plugin comparisons and added guidance", () => {
  expect(() => assertVanillaPluginConditions(plugin, plugin)).toThrow("isolated baseline");
  expect(() => assertVanillaPluginConditions({ ...plugin, executionMode: "baseline" }, plugin)).toThrow("isolated baseline");
  expect(() => assertVanillaPluginConditions(vanilla, { ...plugin, guidanceHash: "experimental" })).toThrow("experimental guidance");
  expect(() => assertVanillaPluginConditions(vanilla, { ...plugin, model: "another-model" })).toThrow("same generator");
});
