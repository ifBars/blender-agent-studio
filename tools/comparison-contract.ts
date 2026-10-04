type Summary = {
  executionMode?: string; guidanceHash?: string | null; skillRoot?: string | null;
  skillFingerprint?: string | null; model?: string; reasoning?: string;
};

/** Execution metadata, not a display label, determines whether this is vanilla. */
export function assertVanillaPluginConditions(vanilla: Summary, plugin: Summary, sharedResourceGuidanceHash?:string): void {
  const sharedResourcePolicy=Boolean(sharedResourceGuidanceHash && vanilla.guidanceHash===sharedResourceGuidanceHash && plugin.guidanceHash===sharedResourceGuidanceHash);
  if (vanilla.executionMode !== "baseline" || vanilla.skillRoot || vanilla.skillFingerprint || (vanilla.guidanceHash&&!sharedResourcePolicy))
    throw new Error("No-plugin condition must be an isolated baseline without skills or added guidance");
  if (plugin.executionMode !== "skills" || !plugin.skillRoot || !plugin.skillFingerprint || (plugin.guidanceHash&&!sharedResourcePolicy))
    throw new Error("With-plugin condition must use pinned plugin skills without experimental guidance");
  if (!vanilla.model || vanilla.model !== plugin.model || vanilla.reasoning !== plugin.reasoning)
    throw new Error("Comparison must use the same generator model and effort");
}
