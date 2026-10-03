import { summarizeAgentEvents } from "./trace.ts";

export function buildClaudeArgs(options: { model?: string; reasoning: string; mode: string; bypassApprovals: boolean }): string[] {
  if (!options.model) throw new Error("Claude benchmarks require an explicit --model");
  if (options.mode === "skills_mcp") throw new Error("Claude skills_mcp isolation is not yet validated; use skills mode");
  if (!["low", "medium", "high", "xhigh", "max"].includes(options.reasoning)) throw new Error("Unsupported Claude effort");
  // safe-mode preserves subscription authentication but disables discovered context.
  // Skills are read explicitly from the pinned paths in the task prompt.
  return ["-p", "--safe-mode", "--model", options.model, "--effort", options.reasoning,
    "--output-format", "stream-json", "--verbose", "--no-session-persistence",
    "--strict-mcp-config", "--disable-slash-commands",
    ...(options.bypassApprovals ? ["--dangerously-skip-permissions"] : ["--permission-mode", "dontAsk"])];
}

export function summarizeClaudeEvents(stdout: string) {
  const summary = { ...summarizeAgentEvents(""), observedModels: [] as string[], reportedCostUsd: null as number | null, resultSubtype: null as string | null };
  const models = new Set<string>();
  for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
    let event: any;
    try { event = JSON.parse(line); } catch { summary.invalidLines++; continue; }
    summary.events++;
    if (event.type === "system" && event.subtype === "init" && event.model) models.add(event.model);
    if (event.type === "assistant" && event.message?.model) models.add(event.message.model);
    for (const block of event.message?.content ?? []) {
      if (block.type === "tool_use") {
        summary.toolCalls++;
        summary.completedItemsByType[block.name] = (summary.completedItemsByType[block.name] ?? 0) + 1;
      }
      if (block.type === "tool_result" && block.is_error) summary.toolFailures++;
    }
    if (event.type === "result") {
      const usage = event.usage ?? {};
      summary.completedTurns = event.num_turns ?? 0;
      summary.errors += event.is_error ? 1 : 0;
      summary.resultSubtype = event.subtype ?? null;
      summary.reportedCostUsd = event.total_cost_usd ?? null;
      summary.usage.cachedInputTokens = usage.cache_read_input_tokens ?? 0;
      summary.usage.cacheWriteInputTokens = usage.cache_creation_input_tokens ?? 0;
      summary.usage.inputTokens = (usage.input_tokens ?? 0) + summary.usage.cachedInputTokens + summary.usage.cacheWriteInputTokens;
      summary.usage.outputTokens = usage.output_tokens ?? 0;
      summary.usage.reasoningOutputTokens = usage.output_tokens_details?.thinking_tokens ?? 0;
      summary.usage.totalTokens = summary.usage.inputTokens + summary.usage.outputTokens;
    }
  }
  summary.observedModels = [...models];
  return summary;
}
