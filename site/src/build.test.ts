import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { basePath, build, checkCoverage, checkLinks } from "./build";

const outDir = mkdtempSync(join(tmpdir(), "bas-docs-"));
const read = (path: string) => readFileSync(join(outDir, path), "utf8");

beforeAll(async () => {
  await build({ siteUrl: "https://example.github.io/blender-agent-studio", outDir });
}, 30_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

test("derives the base path from the site URL", () => {
  expect(basePath("")).toBe("/");
  expect(basePath("https://example.github.io/repo")).toBe("/repo/");
});

test("writes pages, Markdown copies, search, and llms.txt", () => {
  for (const file of ["index.html", "install/index.html", "404.html", "install.md", "search-index.json", "llms-full.txt"]) {
    expect(existsSync(join(outDir, file))).toBe(true);
  }
  expect(read("install/index.html")).toContain('href="/blender-agent-studio/quickstart/"');
  expect(read("llms.txt")).toContain("(https://example.github.io/blender-agent-studio/install.md)");
  expect(read("install.md")).toStartWith("# Installation\n\n> ");
  const search = JSON.parse(read("search-index.json"));
  expect(search.some((entry: { url: string }) => entry.url === "/blender-agent-studio/install/#update")).toBe(true);
});

test("fails when a skill or MCP tool is undocumented", () => {
  const page = (slug: string, body: string) => ({ slug, title: slug, description: "", group: "", body });
  expect(() => checkCoverage([page("skills", ""), page("mcp-tools", "")])).toThrow(
    /Undocumented in site\/content: .*blender-modeling-workflow.*blender_render_scene/,
  );
});

test("fails on links to missing pages, headings, or files", () => {
  const pages = new Map([
    ["/b/", '<a href="/b/one/#setup">x</a><a href="#top">y</a><h2 id="top"></h2>'],
    ["/b/one/", '<h2 id="setup"></h2><a href="/b/one.md">md</a><a href="https://github.com">gh</a>'],
  ]);
  expect(() => checkLinks("/b/", pages, new Set(["/b/one.md"]))).not.toThrow();
  pages.set("/b/two/", '<a href="/b/one/#nope">x</a><a href="/b/gone/">y</a><a href="/elsewhere">z</a>');
  expect(() => checkLinks("/b/", pages, new Set())).toThrow(/one\/#nope[\s\S]*gone[\s\S]*elsewhere/);
});
