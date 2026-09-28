import { expect, test } from "bun:test";
import { highlight, rankSections, type SearchEntry } from "./search";

const entry = (page: string, heading: string, text: string): SearchEntry => ({ page, heading, text, url: "/" });
const entries = [
  entry("How it works", "Beauty renders", "Render through authored cameras. Set denoise to preview or final."),
  entry("MCP tools", "Render", "blender_render_scene checks or renders a scene."),
  entry("Install", "Update", "Upgrade the marketplace."),
];

test("requires every term and ranks heading matches first", () => {
  expect(rankSections(entries, "render").map((e) => e.heading)).toEqual(["Render", "Beauty renders"]);
  expect(rankSections(entries, "render denoise").map((e) => e.heading)).toEqual(["Beauty renders"]);
  expect(rankSections(entries, "missing")).toEqual([]);
  expect(rankSections(entries, "  ")).toEqual([]);
});

test("highlight escapes HTML and marks terms", () => {
  expect(highlight("<b>Render</b> & more", ["render"])).toBe("&lt;b&gt;<mark>Render</mark>&lt;/b&gt; &amp; more");
  expect(highlight("a.b", ["."])).toBe("a<mark>.</mark>b");
});
