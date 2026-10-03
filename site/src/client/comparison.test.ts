import { expect, test } from "bun:test";
import { splitPosition, isVanillaPluginDataset, modelOptions, findPair } from "./comparison";

test("pointer split uses the image bounds and clamps drag beyond either edge", () => {
  expect(splitPosition(350, 100, 500)).toBe(50);
  expect(splitPosition(50, 100, 500)).toBe(0);
  expect(splitPosition(700, 100, 500)).toBe(100);
  expect(splitPosition(100, 100, 0)).toBe(50);
});

test("viewer refuses the previous plugin-versus-guidance dataset", () => {
  expect(isVanillaPluginDataset({ schemaVersion: 1, pairs: [{ current: {}, guided: {} }] })).toBe(false);
  const vanilla = { executionMode: "baseline", skillFingerprint: null, guidanceHash: null };
  const plugin = { executionMode: "skills", skillFingerprint: "pinned", guidanceHash: null };
  const data = { schemaVersion: 2, experiment: "vanilla_vs_plugin", pairs: [{ vanilla, plugin }] };
  expect(isVanillaPluginDataset(data)).toBe(true);
  expect(isVanillaPluginDataset({ ...data, pairs: [{ vanilla: plugin, plugin }] })).toBe(false);
});


test("lantern repetitions stay distinct without duplicate model options", () => {
  const pairs = [1, 2, 3].map(repetition => ({task:"signal_lantern",model:"gpt-6-sol",modelTitle:"GPT 6 Sol",repetition})) as any;
  expect(modelOptions(pairs, "signal_lantern")).toEqual([["gpt-6-sol", "GPT 6 Sol"]]);
  expect(findPair(pairs, "signal_lantern", "gpt-6-sol", "3")?.repetition).toBe(3);
  expect(findPair(pairs, "signal_lantern", "gpt-6-sol", "4")).toBeUndefined();
});
