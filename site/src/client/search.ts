export interface SearchEntry {
  page: string;
  heading: string;
  url: string;
  text: string;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Returns sections containing every query term, best matches first. Headings outrank body text. */
export function rankSections(entries: SearchEntry[], query: string): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    const heading = entry.heading.toLowerCase();
    const page = entry.page.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const wordStart = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}`);
      const wholeWord = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`);
      const inHeading = heading.includes(term);
      const inPage = page.includes(term);
      const inText = text.includes(term);
      if (!inHeading && !inPage && !inText) {
        score = -1;
        break;
      }
      if (inHeading) score += wholeWord.test(heading) ? 14 : wordStart.test(heading) ? 12 : 8;
      if (inPage) score += 4;
      if (inText) score += wordStart.test(text) ? 2 : 1;
    }
    if (score > 0) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(({ entry }) => entry);
}

/** Escapes text for HTML and wraps each occurrence of the terms in <mark>. */
export function highlight(text: string, terms: string[]): string {
  const words = terms.filter(Boolean).map(escapeRegExp);
  if (!words.length) return escapeHtml(text);
  return text
    .split(new RegExp(`(${words.join("|")})`, "gi"))
    .map((part, index) => (index % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join("");
}
