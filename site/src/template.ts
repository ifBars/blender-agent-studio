import { comparisonViewer } from "./comparison-template";
import { site } from "../site.config";
import { icons } from "./icons";
import { escapeHtml, pageUrl, type Heading } from "./markdown";

export interface PageData {
  slug: string;
  title: string;
  description: string;
  group: string;
  html: string;
  headings: Heading[];
}

export interface LayoutContext {
  base: string;
  version: string;
  assets: { css: string; js: string };
  siteUrl?: string;
  pages: PageData[];
  devScript?: string;
}

const themeScript = `(()=>{let t;try{t=localStorage.getItem("bas-theme")}catch{}document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")})()`;

const exampleImage = "benchmarks/gallery-matrix/scene-character/decorated_reading_room--claude-sonnet-5-5--r01/plugin/preview/hero.png";

function head(ctx: LayoutContext, title: string, description: string, slug?: string): string {
  const { base, assets } = ctx;
  const markdown = slug ? `\n<link rel="alternate" type="text/markdown" href="${base}${slug}.md">` : "";
  const canonical = ctx.siteUrl && slug
    ? new URL(pageUrl(base, slug), `${ctx.siteUrl}/`).href
    : undefined;
  const sharing = canonical ? `
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(new URL(`${base}${exampleImage}`, `${ctx.siteUrl}/`).href)}">
<meta property="og:image:alt" content="A reading room built with Blender Agent Studio and Claude Sonnet 5.5">
<meta name="twitter:card" content="summary_large_image">` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">${sharing}
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0b0c" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}assets/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/${assets.css}">${markdown}
<script>${themeScript}</script>
<script type="module" src="${base}assets/${assets.js}"></script>
</head>`;
}

function topbar(ctx: LayoutContext): string {
  return `<header class="topbar">
  <div class="topbar-inner">
    <button class="icon-btn menu-btn" type="button" data-nav-toggle aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icons.menu}</button>
    <a class="brand" href="${ctx.base}">${icons.logo}<span>${site.title}</span></a>
    <span class="version">v${ctx.version}</span>
    <div class="topbar-actions">
      <button class="search-btn" type="button" data-search-open aria-label="Search documentation">${icons.search}<span>Search</span><kbd data-shortcut>Ctrl K</kbd></button>
      <a class="icon-btn" href="${site.repo}" aria-label="GitHub repository">${icons.github}</a>
      <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Toggle dark mode">${icons.sun}${icons.moon}</button>
    </div>
  </div>
</header>`;
}

function sidebar(ctx: LayoutContext, current: string): string {
  const titles = new Map(ctx.pages.map((page) => [page.slug, page.title]));
  const groups = site.nav
    .map((group) => {
      const links = group.pages
        .map((slug) => {
          const active = slug === current ? ' aria-current="page"' : "";
          return `<li><a href="${pageUrl(ctx.base, slug)}"${active}>${escapeHtml(titles.get(slug)!)}</a></li>`;
        })
        .join("");
      return `<div class="nav-group"><p class="nav-title">${group.title}</p><ul class="nav-list">${links}</ul></div>`;
    })
    .join("\n");
  return `<aside class="sidebar" id="sidebar"><nav aria-label="Documentation">${groups}</nav></aside>`;
}

function toc(headings: Heading[]): string {
  const items = headings.filter((heading) => heading.depth <= 3);
  if (items.length < 2) return `<aside class="toc" aria-hidden="true"></aside>`;
  const links = items
    .map((h) => `<li class="depth-${h.depth}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`)
    .join("");
  return `<aside class="toc"><nav aria-label="On this page"><p class="toc-title">On this page</p><ul>${links}</ul></nav></aside>`;
}

function pager(ctx: LayoutContext, slug: string): string {
  const order = site.nav.flatMap((group) => group.pages);
  const index = order.indexOf(slug);
  const find = (s?: string) => ctx.pages.find((page) => page.slug === s);
  const prev = find(order[index - 1]);
  const next = find(order[index + 1]);
  const link = (page: PageData | undefined, rel: "prev" | "next") =>
    page
      ? `<a class="${rel}" href="${pageUrl(ctx.base, page.slug)}" rel="${rel}"><span>${rel === "prev" ? "Previous" : "Next"}</span><strong>${escapeHtml(page.title)}</strong></a>`
      : "";
  return `<nav class="pager" aria-label="Pagination">${link(prev, "prev")}${link(next, "next")}</nav>`;
}

function hero(ctx: LayoutContext): string {
  const [first, ...rest] = site.tagline.split(/(?<=\.)\s+/);
  const installs = site.install.map(({ host, commands }) => {
    const install = commands.join("\n");
    return `<figure class="code install"><figcaption>Install in ${escapeHtml(host)}</figcaption><pre class="shiki plain"><code>${commands
      .map((line) => `<span class="line"><span class="prompt">$ </span>${escapeHtml(line)}</span>`)
      .join("\n")}</code></pre><button class="copy" type="button" data-copy data-copy-text="${escapeHtml(install)}" aria-label="Copy ${escapeHtml(host)} install commands">${icons.copy}${icons.check}</button></figure>`;
  }).join("\n");
  const features = site.features
    .map((feature) => {
      const [slug, hash] = feature.href.split("#");
      const href = pageUrl(ctx.base, slug) + (hash ? `#${hash}` : "");
      return `<a class="feature" href="${href}"><h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.body)}</p></a>`;
    })
    .join("");
  return `<section class="hero">
  <p class="eyebrow">Codex &amp; Claude Code · Blender 5.2</p>
  <h1>${escapeHtml(first)} <span>${escapeHtml(rest.join(" "))}</span></h1>
  <p class="lead">${escapeHtml(site.description)}</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="${pageUrl(ctx.base, "install")}">Get started ${icons.arrow}</a>
    <a class="btn btn-secondary" href="${pageUrl(ctx.base, "comparisons")}">See examples ${icons.arrow}</a>
    <a class="btn btn-secondary" href="${site.repo}">${icons.github} View on GitHub</a>
  </div>
  <figure class="example-preview">
    <a href="${pageUrl(ctx.base, "comparisons")}"><img src="${ctx.base}${exampleImage}" alt="A furnished reading room built with Blender Agent Studio and Claude Sonnet 5.5" width="1536" height="864" fetchpriority="high"></a>
    <figcaption>Made with Claude Code and Sonnet 5.5. <a href="${pageUrl(ctx.base, "comparisons")}">Explore the paired examples ${icons.arrow}</a></figcaption>
  </figure>
  ${installs}
</section>
<section class="features" aria-label="Features">${features}</section>`;
}

const searchDialog = `<dialog class="search" aria-label="Search documentation">
  <div class="search-box">${icons.search}<input type="search" placeholder="Search the docs" aria-label="Search" aria-controls="search-results" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
  <ul class="search-results" id="search-results" role="listbox" aria-label="Results"></ul>
  <footer class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></footer>
</dialog>`;

export function renderPage(ctx: LayoutContext, page: PageData): string {
  const home = page.slug === "index";
  const title = home ? `${site.title} · Free, open-source Blender AI plugin` : `${page.title} · ${site.title}`;
  const header = home
    ? hero(ctx)
    : `<header class="doc-header">
  <p class="eyebrow">${escapeHtml(page.group)}</p>
  <h1>${escapeHtml(page.title)}</h1>
  <p class="lead">${escapeHtml(page.description)}</p>
</header>`;
  const edit = `${site.repo}/edit/${site.branch}/site/content/${page.slug}.md`;
  return `${head(ctx, title, page.description, page.slug)}
<body data-base="${ctx.base}"${home ? ' class="home"' : page.slug === "comparisons" ? ' class="comparison-page"' : ""}>
<a class="skip" href="#content">Skip to content</a>
${topbar(ctx)}
<div class="shell">
${sidebar(ctx, page.slug)}
<main class="main" id="content">
<article class="doc">
${header}
${page.slug === "comparisons" ? comparisonViewer(ctx.base) : ""}
<div class="prose">
${page.html}
</div>
${pager(ctx, page.slug)}
<footer class="doc-footer">
  <div class="doc-links">
    <a href="${edit}">${icons.edit} Edit this page</a>
    <button type="button" class="link-btn" data-copy data-copy-src="${ctx.base}${page.slug}.md">${icons.copy}${icons.check} Copy as Markdown</button>
  </div>
  <p>MIT licensed. Not affiliated with the Blender Foundation.</p>
</footer>
</article>
</main>
${home ? `<aside class="toc" aria-hidden="true"></aside>` : toc(page.headings)}
</div>
<div class="scrim" data-nav-close></div>
${searchDialog}${ctx.devScript ?? ""}
</body>
</html>
`;
}

export function renderNotFound(ctx: LayoutContext): string {
  return `${head(ctx, `Page not found · ${site.title}`, site.description)}
<body data-base="${ctx.base}">
${topbar(ctx)}
<main class="not-found" id="content">
  <p class="eyebrow">404</p>
  <h1>Page not found</h1>
  <p class="lead">This page moved or never existed.</p>
  <a class="btn btn-primary" href="${ctx.base}">Back to the docs ${icons.arrow}</a>
</main>
${searchDialog}
</body>
</html>
`;
}
