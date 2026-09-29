import { readdirSync, readFileSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHighlighter } from "shiki";
import { site } from "../site.config";
import { createMarkdown, pageUrl, parseFrontmatter, searchSections } from "./markdown";
import { renderNotFound, renderPage, type LayoutContext, type PageData } from "./template";

const siteRoot = resolve(import.meta.dir, "..");
const repoRoot = resolve(siteRoot, "..");
const pluginRoot = join(repoRoot, "plugins", "blender-agent-studio");
const contentDir = join(siteRoot, "content");

export interface BuildOptions {
  /** Absolute site URL, e.g. https://ifbars.github.io/blender-agent-studio. Empty for root-relative output. */
  siteUrl?: string;
  outDir?: string;
  devScript?: string;
}

interface SourcePage {
  slug: string;
  title: string;
  description: string;
  group: string;
  body: string;
}

export function basePath(siteUrl = ""): string {
  const path = siteUrl ? new URL(siteUrl).pathname : "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function loadPages(): SourcePage[] {
  const files = readdirSync(contentDir).filter((file) => file.endsWith(".md"));
  const navSlugs = site.nav.flatMap((group) => group.pages);
  const fileSlugs = files.map((file) => file.slice(0, -3));
  const missing = navSlugs.filter((slug) => !fileSlugs.includes(slug));
  const orphaned = fileSlugs.filter((slug) => !navSlugs.includes(slug));
  if (missing.length) throw new Error(`Navigation lists missing pages: ${missing.join(", ")}`);
  if (orphaned.length) throw new Error(`Pages missing from navigation: ${orphaned.join(", ")}`);

  return site.nav.flatMap((group) =>
    group.pages.map((slug) => {
      const { data, body } = parseFrontmatter(readFileSync(join(contentDir, `${slug}.md`), "utf8"));
      if (!data.title || !data.description) throw new Error(`${slug}.md needs a title and description`);
      return { slug, title: data.title, description: data.description, group: group.title, body };
    }),
  );
}

/** Fails the build when a skill or MCP tool ships without documentation. */
export function checkCoverage(pages: SourcePage[]): void {
  const text = (slug: string) => pages.find((page) => page.slug === slug)?.body ?? "";
  const skills = readdirSync(join(pluginRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const server = readFileSync(join(pluginRoot, "mcp", "server.ts"), "utf8");
  const tools = [
    ...server.matchAll(/registerTool\(\s*"(blender_\w+)"/g),
    ...(server.match(/for \(const name of \[([^\]]+)\]/)?.[1].matchAll(/"(blender_\w+)"/g) ?? []),
  ].map((match) => match[1]);
  if (!skills.length || tools.length < 10) throw new Error("Could not read plugin skills or MCP tools");

  const undocumented = [
    ...skills.filter((skill) => !text("skills").includes(`\`${skill}\``)),
    ...tools.filter((tool) => !text("mcp-tools").includes(`\`${tool}\``)),
  ];
  if (undocumented.length) {
    throw new Error(`Undocumented in site/content: ${undocumented.join(", ")}`);
  }
}

/** Verifies that every internal href in the generated HTML points at a page and heading that exist. */
export function checkLinks(base: string, rendered: Map<string, string>, files: Set<string>): void {
  const anchors = new Map<string, Set<string>>();
  for (const [route, html] of rendered) {
    anchors.set(route, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
  }
  const broken: string[] = [];
  for (const [route, html] of rendered) {
    for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [path, hash] = href.startsWith("#") ? [route, href.slice(1)] : href.split("#");
      if (!path.startsWith(base)) {
        broken.push(`${route} -> ${href}`);
        continue;
      }
      const target = anchors.get(path);
      if (target) {
        if (hash && !target.has(hash)) broken.push(`${route} -> ${href}`);
      } else if (!files.has(path)) {
        broken.push(`${route} -> ${href}`);
      }
    }
  }
  if (broken.length) throw new Error(`Broken links:\n  ${broken.join("\n  ")}`);
}

function markdownCopy(page: SourcePage): string {
  return `# ${page.title}\n\n> ${page.description}\n\n${page.body.trim()}\n`;
}

export async function build(options: BuildOptions = {}): Promise<{ pages: number; outDir: string }> {
  const siteUrl = (options.siteUrl ?? "").replace(/\/$/, "");
  const base = basePath(siteUrl);
  const outDir = options.outDir ?? join(siteRoot, "dist");
  const pluginManifest = JSON.parse(readFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));

  const sources = loadPages();
  checkCoverage(sources);

  const highlighter = await createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: ["bash", "powershell", "json", "python", "typescript", "text"],
  });
  const render = createMarkdown({ base, slugs: new Set(sources.map((page) => page.slug)), highlighter });
  const pages: PageData[] = sources.map((source) => ({ ...source, ...render(source.body) }));
  highlighter.dispose();

  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, "assets"), { recursive: true });

  const bundle = await Bun.build({
    entrypoints: [join(siteRoot, "src", "client", "main.ts")],
    target: "browser",
    minify: true,
  });
  if (!bundle.success) throw new AggregateError(bundle.logs, "Client bundle failed");
  const js = await bundle.outputs[0].text();
  const css = readFileSync(join(siteRoot, "src", "styles.css"), "utf8");
  const hash = (content: string) => Bun.hash(content).toString(36).slice(0, 8);
  const assets = { css: `style.${hash(css)}.css`, js: `app.${hash(js)}.js` };

  const fontDir = join(siteRoot, "node_modules", "@fontsource-variable", "inter");
  await Promise.all([
    writeFile(join(outDir, "assets", assets.css), css),
    writeFile(join(outDir, "assets", assets.js), js),
    cp(join(fontDir, "files", "inter-latin-wght-normal.woff2"), join(outDir, "assets", "inter.woff2")),
    cp(join(fontDir, "LICENSE"), join(outDir, "assets", "inter-LICENSE.txt")),
    cp(join(siteRoot, "public"), outDir, { recursive: true }),
  ]);

  const ctx: LayoutContext = { base, version: pluginManifest.version, assets, pages, devScript: options.devScript };
  const rendered = new Map<string, string>();
  for (const page of pages) {
    const html = renderPage(ctx, page);
    rendered.set(pageUrl(base, page.slug), html);
    const file = page.slug === "index" ? "index.html" : join(page.slug, "index.html");
    await mkdir(dirname(join(outDir, file)), { recursive: true });
    await writeFile(join(outDir, file), html);
  }
  await writeFile(join(outDir, "404.html"), renderNotFound(ctx));

  const absolute = (path: string) => (siteUrl ? new URL(path, siteUrl).href : path);
  const search = pages.flatMap((page) =>
    searchSections(page.html).map((section) => ({
      page: page.title,
      heading: section.heading,
      url: pageUrl(base, page.slug) + (section.id ? `#${section.id}` : ""),
      text: section.text,
    })),
  );
  const llms = [
    `# ${site.title}`,
    "",
    `> ${site.description}`,
    "",
    ...site.nav.flatMap((group) => [
      `## ${group.title}`,
      "",
      ...group.pages.map((slug) => {
        const page = sources.find((source) => source.slug === slug)!;
        return `- [${page.title}](${absolute(`${base}${slug}.md`)}): ${page.description}`;
      }),
      "",
    ]),
  ].join("\n");
  await Promise.all([
    writeFile(join(outDir, "search-index.json"), JSON.stringify(search)),
    writeFile(join(outDir, "llms.txt"), llms),
    writeFile(join(outDir, "llms-full.txt"), sources.map(markdownCopy).join("\n---\n\n")),
    ...sources.map((page) => writeFile(join(outDir, `${page.slug}.md`), markdownCopy(page))),
  ]);

  const files = new Set<string>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else files.add(`${prefix}${entry.name}`);
    }
  };
  walk(outDir, base);
  checkLinks(base, rendered, files);

  return { pages: pages.length, outDir };
}

if (import.meta.main) {
  const started = performance.now();
  const result = await build({ siteUrl: process.env.DOCS_SITE_URL });
  const elapsed = Math.round(performance.now() - started);
  console.log(`Built ${result.pages} pages into ${result.outDir} in ${elapsed} ms`);
}
