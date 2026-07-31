export type AgentTraceSummary = {
  events: number;
  invalidLines: number;
  completedTurns: number;
  completedItemsByType: Record<string, number>;
  toolCalls: number;
  toolFailures: number;
  errors: number;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteInputTokens: number;
    outputTokens: number;
    reasoningOutputTokens: number;
    totalTokens: number;
  };
};

const TOOL_ITEM_TYPES = new Set([
  "command_execution",
  "file_change",
  "mcp_tool_call",
  "tool_call",
  "web_search",
]);

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeAgentEvents(stdout: string): AgentTraceSummary {
  const summary: AgentTraceSummary = {
    events: 0,
    invalidLines: 0,
    completedTurns: 0,
    completedItemsByType: {},
    toolCalls: 0,
    toolFailures: 0,
    errors: 0,
    usage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
    },
  };

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      summary.invalidLines += 1;
      continue;
    }
    summary.events += 1;
    if (event.type === "turn.completed") {
      summary.completedTurns += 1;
      const usage = (event.usage ?? {}) as Record<string, unknown>;
      summary.usage.inputTokens += numeric(usage.input_tokens);
      summary.usage.cachedInputTokens += numeric(usage.cached_input_tokens);
      summary.usage.cacheWriteInputTokens += numeric(
        usage.cache_write_input_tokens,
      );
      summary.usage.outputTokens += numeric(usage.output_tokens);
      summary.usage.reasoningOutputTokens += numeric(
        usage.reasoning_output_tokens,
      );
      continue;
    }
    if (event.type !== "item.completed") {
      continue;
    }
    const item = (event.item ?? {}) as Record<string, unknown>;
    const itemType =
      typeof item.type === "string" && item.type ? item.type : "unknown";
    summary.completedItemsByType[itemType] =
      (summary.completedItemsByType[itemType] ?? 0) + 1;
    if (TOOL_ITEM_TYPES.has(itemType) || itemType.endsWith("_tool_call")) {
      summary.toolCalls += 1;
      const exitCode = item.exit_code;
      if (
        item.status === "failed" ||
        item.status === "error" ||
        (typeof exitCode === "number" && exitCode !== 0)
      ) {
        summary.toolFailures += 1;
      }
    }
    if (itemType === "error") {
      summary.errors += 1;
    }
  }

  summary.usage.totalTokens =
    summary.usage.inputTokens + summary.usage.outputTokens;
  return summary;
}
