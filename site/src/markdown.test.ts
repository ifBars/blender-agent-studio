import { beforeAll, describe, expect, test } from "bun:test";
import { createHighlighter } from "shiki";
import { createMarkdown, parseFrontmatter, resolveHref, searchSections, slugify, type Rendered } from "./markdown";

let render: (source: string) => Rendered;

beforeAll(async () => {
  const highlighter = await createHighlighter({ themes: ["github-light", "github-dark"], langs: ["bash", "text"] });
  render = createMarkdown({ base: "/docs/", slugs: new Set(["index", "install"]), highlighter });
});

describe("parseFrontmatter", () => {
  test("reads simple keys and strips quotes", () => {
    const { data, body } = parseFrontmatter('---\ntitle: "Install"\ndescription: Set it up.\n---\n\nBody');
    expect(data).toEqual({ title: "Install", description: "Set it up." });
    expect(body).toBe("\nBody");
  });

  test("returns the source unchanged without frontmatter", () => {
    expect(parseFrontmatter("# Hi").body).toBe("# Hi");
  });
});

describe("links", () => {
  test("slugify matches GitHub-style anchors", () => {
    expect(slugify("What this doesn't show")).toBe("what-this-doesnt-show");
    expect(slugify("blender_render_scene")).toBe("blender_render_scene");
  });

  test("resolves page links under the base path", () => {
    const options = { base: "/docs/", slugs: new Set(["index", "install"]) };
    expect(resolveHref("install.md#update", options)).toBe("/docs/install/#update");
    expect(resolveHref("index.md", options)).toBe("/docs/");
    expect(resolveHref("https://example.com/a.md", options)).toBe("https://example.com/a.md");
    expect(() => resolveHref("missing.md", options)).toThrow("unknown page");
  });
});

describe("createMarkdown", () => {
  test("gives headings unique ids and collects them", () => {
    const { html, headings } = render("## Setup\n\n### `blender_version`\n\n## Setup");
    expect(headings.map((heading) => heading.id)).toEqual(["setup", "blender_version", "setup-1"]);
    expect(html).toContain('<h2 id="setup-1">');
  });

  test("rejects level-one headings", () => {
    expect(() => render("# Title")).toThrow("frontmatter");
  });

  test("renders titled, highlighted code with a copy button", () => {
    const { html } = render('```bash title="macOS"\nexport A=1\n```');
    expect(html).toContain("<figcaption>macOS</figcaption>");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("data-copy");
  });

  test("renders GitHub alerts as callouts", () => {
    const { html } = render("> [!NOTE]\n> Build the runtime first.");
    expect(html).toContain('class="callout callout-note"');
    expect(html).toContain("<p>Build the runtime first.</p>");
    expect(render("> Just a quote").html).toContain("<blockquote>");
  });

  test("labels table cells for stacked mobile layout", () => {
    const { html } = render("| Tool | What it does |\n| --- | --- |\n| `a` | Thing |");
    expect(html).toContain('<table class="cols-2">');
    expect(html).toContain('<td data-label="What it does">Thing</td>');
  });
});

test("searchSections splits plain text at headings", () => {
  const { html } = render("Intro text.\n\n## Render\n\nUse `denoise` &amp; more.\n\n```bash\nbun run x\n```\n\n| Key | Value |\n| - | - |\n| a | b |");
  expect(searchSections(html)).toEqual([
    { heading: "", id: "", text: "Intro text." },
    { heading: "Render", id: "render", text: "Use denoise & more. bun run x a b" },
  ]);
});
