import { initComparison } from "./comparison";
import { rankSections, highlight, type SearchEntry } from "./search";
import { copyButton } from "./copy";

const root = document.documentElement;
const base = document.body.dataset.base ?? "/";
const comparison = document.querySelector<HTMLElement>("[data-comparison]");
if (comparison) initComparison(comparison, base);
const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector);

// Theme: an explicit choice is stored; otherwise follow the system setting.
const storedTheme = () => {
  try {
    return localStorage.getItem("bas-theme");
  } catch {
    return null;
  }
};
$("[data-theme-toggle]")?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("bas-theme", next);
  } catch {}
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (!storedTheme()) root.dataset.theme = event.matches ? "dark" : "light";
});

// Copy buttons: code blocks, the install snippet, and "Copy as Markdown".
document.addEventListener("click", async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("[data-copy]");
  if (!button) return;
  await copyButton(button);
});

// Mobile navigation drawer.
const navToggle = $<HTMLButtonElement>("[data-nav-toggle]");
const setNav = (open: boolean) => {
  document.body.classList.toggle("nav-open", open);
  navToggle?.setAttribute("aria-expanded", String(open));
};
navToggle?.addEventListener("click", () => setNav(!document.body.classList.contains("nav-open")));
$("[data-nav-close]")?.addEventListener("click", () => setNav(false));
$("#sidebar")?.addEventListener("click", (event) => {
  if ((event.target as Element).closest("a")) setNav(false);
});

// Highlight the current section in "On this page".
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>(".toc a")];
if (tocLinks.length) {
  const targets = tocLinks.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  let frame = 0;
  const update = () => {
    frame = 0;
    const offset = 120;
    let active = 0;
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top < offset) active = index;
    });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) active = targets.length - 1;
    tocLinks.forEach((link, index) => link.classList.toggle("active", index === active));
  };
  addEventListener("scroll", () => (frame ||= requestAnimationFrame(update)), { passive: true });
  update();
}

// Search dialog.
const dialog = $<HTMLDialogElement>("dialog.search")!;
const input = dialog.querySelector("input")!;
const list = dialog.querySelector<HTMLUListElement>(".search-results")!;
let entries: SearchEntry[] | undefined;
let results: SearchEntry[] = [];
let selected = 0;

if (/Mac|iPhone|iPad/.test(navigator.platform)) {
  const shortcut = $("[data-shortcut]");
  if (shortcut) shortcut.textContent = "⌘K";
}

async function openSearch() {
  if (!dialog.open) dialog.showModal();
  input.select();
  entries ??= await fetch(`${base}search-index.json`).then((response) => response.json());
  renderResults();
}

function renderResults() {
  const query = input.value.trim();
  if (!entries) return;
  results = query ? rankSections(entries, query).slice(0, 12) : entries.filter((entry) => !entry.heading);
  selected = 0;
  if (!results.length) {
    list.innerHTML = `<li class="search-empty">No results for “${highlight(query, [])}”</li>`;
    return;
  }
  list.innerHTML = results
    .map((entry, index) => {
      const heading = entry.heading || entry.page;
      const path = entry.heading ? entry.page : "Page";
      const snippet = query ? highlight(snippetFor(entry.text, query), query.split(/\s+/)) : "";
      return `<li role="option" id="result-${index}" aria-selected="${index === 0}"><a href="${entry.url}">
        <span class="result-path">${highlight(path, [])}</span>
        <span class="result-heading">${highlight(heading, query.split(/\s+/))}</span>
        ${snippet ? `<span class="result-text">${snippet}</span>` : ""}</a></li>`;
    })
    .join("");
  input.setAttribute("aria-activedescendant", "result-0");
}

function snippetFor(text: string, query: string): string {
  const lower = text.toLowerCase();
  const at = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 40);
  return (start ? "…" : "") + text.slice(start, start + 160) + (start + 160 < text.length ? "…" : "");
}

function select(index: number) {
  const items = list.querySelectorAll<HTMLLIElement>("[role=option]");
  if (!items.length) return;
  selected = (index + items.length) % items.length;
  items.forEach((item, i) => item.setAttribute("aria-selected", String(i === selected)));
  items[selected].scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", items[selected].id);
}

input.addEventListener("input", renderResults);
input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    select(selected + (event.key === "ArrowDown" ? 1 : -1));
  } else if (event.key === "Enter" && results[selected]) {
    event.preventDefault();
    dialog.close();
    location.href = results[selected].url;
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
  else if ((event.target as Element).closest("a")) dialog.close();
});
document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
document.addEventListener("keydown", (event) => {
  const typing = (event.target as Element).closest("input, textarea, [contenteditable]");
  if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
    event.preventDefault();
    openSearch();
  } else if (event.key === "Escape") {
    setNav(false);
  }
});
