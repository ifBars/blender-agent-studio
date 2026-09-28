import { Marked, type Token, type Tokens } from "marked";
import type { Highlighter } from "shiki";
import { icons } from "./icons";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface Rendered {
  html: string;
  headings: Heading[];
}

export interface RenderOptions {
  base: string;
  slugs: ReadonlySet<string>;
  highlighter: Highlighter;
}

const CALLOUTS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;

export function parseFrontmatter(source: string): { data: Record<string, string>; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (pair) data[pair[1]] = pair[2].replace(/^(["'])(.*)\1$/, "$2").trim();
  }
  return { data, body: source.slice(match[0].length) };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

export function pageUrl(base: string, slug: string): string {
  return slug === "index" ? base : `${base}${slug}/`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainHeading(text: string): string {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*+/g, "");
}

/** Resolves `page.md#hash` links to site URLs and rejects links to unknown pages. */
export function resolveHref(href: string, options: Pick<RenderOptions, "base" | "slugs">): string {
  const match = href.match(/^(?:\.\/)?([\w-]+)\.md(#.*)?$/);
  if (!match) return href;
  if (!options.slugs.has(match[1])) throw new Error(`Link to unknown page: ${href}`);
  return pageUrl(options.base, match[1]) + (match[2] ?? "");
}

export function createMarkdown(options: RenderOptions): (source: string) => Rendered {
  let headings: Heading[] = [];
  let seen = new Map<string, number>();

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }) {
        if (depth === 1) throw new Error("Use frontmatter `title` instead of a level-one heading");
        const label = plainHeading(text);
        let id = slugify(label);
        const count = seen.get(id) ?? 0;
        seen.set(id, count + 1);
        if (count) id = `${id}-${count}`;
        headings.push({ depth, text: label, id });
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const info = lang ?? "";
        const language = info.match(/^\S*/)?.[0] || "text";
        const title = info.match(/title="([^"]+)"/)?.[1];
        const loaded = options.highlighter.getLoadedLanguages().includes(language);
        const highlighted = options.highlighter.codeToHtml(text.replace(/\n$/, ""), {
          lang: loaded ? language : "text",
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
        const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : "";
        return `<figure class="code">${caption}${highlighted}<button class="copy" type="button" data-copy aria-label="Copy code">${icons.copy}${icons.check}</button></figure>\n`;
      },
      link({ href, title, tokens }) {
        const target = resolveHref(href, options);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(target)}"${titleAttr}>${this.parser.parseInline(tokens)}</a>`;
      },
      blockquote({ tokens }) {
        const inner = this.parser.parse(tokens);
        const match = inner.match(/^<p>\[!(\w+)\]\s*/);
        const kind = match?.[1].toUpperCase() as (typeof CALLOUTS)[number] | undefined;
        if (!kind || !CALLOUTS.includes(kind)) return `<blockquote>\n${inner}</blockquote>\n`;
        const label = kind[0] + kind.slice(1).toLowerCase();
        return `<div class="callout callout-${kind.toLowerCase()}"><p class="callout-title">${label}</p><p>${inner.slice(match![0].length)}</div>\n`;
      },
      table({ header, rows }: Tokens.Table) {
        const cell = (tokens: Token[]) => this.parser.parseInline(tokens);
        const head = header.map((th) => `<th>${cell(th.tokens)}</th>`).join("");
        const body = rows
          .map((row) => {
            const cells = row.map((td, i) => `<td data-label="${escapeHtml(header[i].text)}">${cell(td.tokens)}</td>`);
            return `<tr>${cells.join("")}</tr>`;
          })
          .join("\n");
        return `<div class="table-wrap"><table class="cols-${header.length}"><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table></div>\n`;
      },
    },
  });

  return (source) => {
    headings = [];
    seen = new Map();
    const html = marked.parse(source, { async: false });
    return { html, headings };
  };
}

export interface SearchSection {
  heading: string;
  id: string;
  text: string;
}

/** Splits rendered HTML into plain-text sections at each h2/h3 for the search index. */
export function searchSections(html: string): SearchSection[] {
  const sections: SearchSection[] = [];
  const parts = html.split(/(<h[23] id="[^"]+">[\s\S]*?<\/h[23]>)/);
  let current: SearchSection = { heading: "", id: "", text: "" };
  for (const part of parts) {
    const heading = part.match(/^<h[23] id="([^"]+)">([\s\S]*?)<\/h[23]>$/);
    if (heading) {
      sections.push(current);
      current = { heading: toText(heading[2]), id: heading[1], text: "" };
    } else {
      current.text += " " + toText(part);
    }
  }
  sections.push(current);
  return sections
    .map((section) => ({ ...section, text: section.text.replace(/\s+/g, " ").trim() }))
    .filter((section) => section.heading || section.text);
}

function toText(html: string): string {
  return html
    .replace(/<a class="anchor"[^>]*>#<\/a>/g, "")
    .replace(/<thead>[\s\S]*?<\/thead>/g, "")
    .replace(/<button[\s\S]*?<\/button>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
