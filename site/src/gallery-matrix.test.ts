import { expect, test } from "bun:test";
import { assertCompleteGallery, assertPublishedGallery, evidenceFrameNumbers, GALLERY_MODELS, GALLERY_TASKS, SCENE_CHARACTER_GALLERY_TASKS, selectHistoricalRows } from "../../tools/gallery-matrix";

test('published expansion accepts completed pairs without claiming a complete new cohort', () => {
  const rows = GALLERY_TASKS.flatMap(task => GALLERY_MODELS.map(model => ({task,model,repetition:1})));
  rows.push({task:'signal_lantern',model:'gpt-6-sol',repetition:3});
  const added = {task:'coastal_cafe_holdout',model:'gpt-6-astra',repetition:1};
  expect(() => assertPublishedGallery([...rows,added])).not.toThrow();
  expect(() => assertPublishedGallery([...rows,added,added])).toThrow('duplicated');
  expect(() => assertPublishedGallery([...rows.slice(1),added])).toThrow('Incomplete');
  expect(() => assertPublishedGallery([...rows,{...added,model:'unknown'}])).toThrow('Invalid');
});

test("review framing preserves sampled animation frame numbers from evidence records", () => {
  expect(evidenceFrameNumbers([{ frame: 1, path: "frame_0001.png" }, { frame: 24, path: "frame_0024.png" }, { frame: 48, path: "frame_0048.png" }])).toEqual([1, 24, 48]);
  expect(evidenceFrameNumbers([1, 24, 48])).toEqual([1, 24, 48]);
  expect(() => evidenceFrameNumbers([{ path: "frame.png" }])).toThrow("Invalid evidence frame");
});

test("scene and character expansion retains the historical cohort and all four models", () => {
  const rows = [...GALLERY_TASKS, ...SCENE_CHARACTER_GALLERY_TASKS].flatMap(task => GALLERY_MODELS.map(model => ({task, model, repetition: 1})));
  rows.push({task: "signal_lantern", model: "gpt-6-sol", repetition: 3});
  expect(rows.length).toBe(45);
  expect(() => assertCompleteGallery(rows, SCENE_CHARACTER_GALLERY_TASKS)).not.toThrow();
  expect(() => assertCompleteGallery(rows.filter(row => row.task !== "game_scout_deformation"), SCENE_CHARACTER_GALLERY_TASKS)).toThrow("Incomplete");
  expect(() => assertCompleteGallery([...rows, rows[30]], SCENE_CHARACTER_GALLERY_TASKS)).toThrow("duplicated");
});

test("curation retains the complete third pair without relabeling the older model", () => {
  const rows = [1, 2, 3].map(repetition => ({ task: "signal_lantern", model: "gpt-6-sol", repetition, vanilla: `v${repetition}`, plugin: `p${repetition}` }));
  expect(selectHistoricalRows(rows)).toEqual([rows[2]]);
  expect(rows.length).toBe(3);
  expect(() => selectHistoricalRows(rows.slice(0, 2))).toThrow("run 3");
});

test("the published gallery requires each of the four models on every task", () => {
  const rows = GALLERY_TASKS.flatMap(task => GALLERY_MODELS.map(model => ({ task, model, repetition: 1 })));
  rows.push({ task: "signal_lantern", model: "gpt-6-sol", repetition: 3 });
  expect(() => assertCompleteGallery(rows)).not.toThrow();
  expect(() => assertCompleteGallery(rows.slice(1))).toThrow("Incomplete");
  expect(() => assertCompleteGallery([...rows, rows[0]])).toThrow("duplicated");
  expect(() => assertCompleteGallery(rows.map(p => p.model === "gpt-6-sol" ? { ...p, repetition: 1 } : p))).toThrow("run 3");
});
