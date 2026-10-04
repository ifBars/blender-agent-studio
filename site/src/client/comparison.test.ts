import { expect, test } from "bun:test";
import { splitPosition, isVanillaPluginDataset, modelOptions, findPair, imageFraming, viewLabel } from "./comparison";

test("image labels reflect authored aspect ratios and differing source resolutions", () => {
  expect(imageFraming(true, {width: 512, height: 288}, {width: 384, height: 384})).toBe("Review images · 512 / 384 px longest edge");
  expect(imageFraming(false, {width: 1280, height: 720}, {width: 1280, height: 960})).toBe("Preview · 1280 px longest edge · Reviews use the original evidence");
  expect(imageFraming(true, {width:1,height:1}, {width:1,height:1})).toBe("Visual evidence unavailable");
  expect(viewLabel("frame_0013")).toBe("Frame 13");
  expect(viewLabel("reverse")).toBe("Reverse");
});

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
test('viewer accepts verified shared resource controls but rejects unequal guidance',()=>{
  const pair={vanilla:{executionMode:'baseline',skillFingerprint:null,guidanceHash:'resource'},plugin:{executionMode:'skills',skillFingerprint:'pinned',guidanceHash:'resource'},
    sharedResourceGuidanceHash:'resource',resourcePolicy:{cpuHardCapPercent:20,concurrency:1}};
  const data={schemaVersion:2,experiment:'vanilla_vs_plugin',pairs:[pair]};
  expect(isVanillaPluginDataset(data)).toBe(true);
  expect(isVanillaPluginDataset({...data,pairs:[{...pair,plugin:{...pair.plugin,guidanceHash:'other'}}]})).toBe(false);
  expect(isVanillaPluginDataset({...data,pairs:[{...pair,sharedResourceGuidanceHash:null}]})).toBe(false);
});


test("selected historical lantern keeps run 3 provenance without a run selector", () => {
  const pairs = [{task:"signal_lantern",model:"gpt-6-sol",modelTitle:"GPT 6 Sol",repetition:3}] as any;
  expect(modelOptions(pairs, "signal_lantern")).toEqual([["gpt-6-sol", "GPT 6 Sol"]]);
  expect(findPair(pairs, "signal_lantern", "gpt-6-sol")?.repetition).toBe(3);
  expect(findPair(pairs, "signal_lantern", "gpt-6.1-sol")).toBeUndefined();
});
