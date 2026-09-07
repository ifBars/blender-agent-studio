// Verified against the local Codex model catalog on 2026-09-04.
// Profiles are opt-in benchmark settings, not global model preferences.
const PROFILES = {
  astra: "gpt-6-astra",
  sol: "gpt-5.6-sol",
  terra: "gpt-5.6-terra",
  luna: "gpt-5.6-luna",
} as const;

export function resolveModelOptions(options: {
  profile?: string;
  model?: string;
  reasoning?: string;
}) {
  if (options.profile && !Object.hasOwn(PROFILES, options.profile)) {
    throw new Error(`Unsupported model profile: ${options.profile}. Use astra, sol, terra, or luna.`);
  }
  const profileModel = options.profile
    ? PROFILES[options.profile as keyof typeof PROFILES]
    : undefined;
  if (profileModel && options.model && options.model !== profileModel) {
    throw new Error(`--profile ${options.profile} selects ${profileModel}; conflicting --model ${options.model}.`);
  }
  const model = options.model ?? profileModel;
  // Keep effort equal across comparison profiles and preserve the prior default.
  const reasoning = options.reasoning ?? "medium";
  const knownModel = Object.values(PROFILES).some((value) => value === model);
  const efforts = knownModel
    ? ["low", "medium", "high", "xhigh", "max", ...(model === PROFILES.luna ? [] : ["ultra"])]
    : ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
  if (!efforts.includes(reasoning)) {
    throw new Error(`Unsupported reasoning effort ${reasoning} for ${model ?? "configured model"}. Use ${efforts.join(", ")}.`);
  }
  return { model, reasoning, modelProfile: options.profile ?? null };
}
