/** Browser handoff only: Pixabay's documented API does not expose sound effects. */
export function preparePixabaySoundSearch(query: string) {
  const text = query.trim();
  if (!text || text.length > 200) throw new Error("Supply a search query of 1–200 characters");
  return {
    status: "browser_required",
    query: text,
    url: `https://pixabay.com/sound-effects/search/${encodeURIComponent(text)}/`,
    instructions: [
      "Open the URL with host browser tools and read the live sound-effect results. This tool does not return catalog results.",
      "Preview candidates on Pixabay; record the chosen sound's title, creator, duration, and source page URL.",
      "If the sound is needed locally, download it through the browser and verify the completed file before using it in Blender.",
      "Review Pixabay's current Content License for the intended use and keep the source page with the project notes. Do not redistribute the sound as a standalone asset.",
    ],
    limitations: [
      "Requires host browser tools for live search, preview, and download.",
      "Pixabay's documented public API covers images and videos, not sound effects; this handoff does not call an audio API or scrape the catalog.",
      "Website availability and download requirements are external dependencies.",
    ],
  };
}
