/** Browser handoff only: no private Adobe endpoints or credential handling. */
export function prepareMixamoSearch(query: string) {
  const text = query.trim();
  if (!text || text.length > 200) throw new Error("Supply a search query of 1–200 characters");
  const parameters = new URLSearchParams({page: "1", query: text, type: "Motion,MotionPack"});
  return {
    status: "browser_required",
    query: text,
    url: `https://www.mixamo.com/#/?${parameters}`,
    instructions: [
      "Open the URL with the host browser tools. Read actual result cards; this tool does not return catalog results.",
      "Use the user's signed-in Adobe session, or ask them to sign in if required. Never request passwords or extract session tokens.",
      "Select a character and preview the chosen motion. Record its name and settings, including in-place when offered.",
      "Download FBX with skin for a standalone animated character. Without skin supplies motion on its skeleton, not automatic retargeting to another rig.",
      "Pass the completed local FBX path to blender_import_mixamo_animation. Verify download completion first.",
    ],
    limitations: ["Requires host browser tools for live search, preview and download.", "Website availability and Adobe sign-in are external dependencies."],
  };
}
