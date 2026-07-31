import { describe, expect, test } from "bun:test";
import { summarizeAgentEvents } from "./trace.ts";

describe("summarizeAgentEvents", () => {
  test("summarizes current Codex JSON event usage and completed tools", () => {
    const summary = summarizeAgentEvents(
      [
        '{"type":"thread.started","thread_id":"thread"}',
        '{"type":"item.completed","item":{"type":"command_execution","exit_code":0}}',
        '{"type":"item.completed","item":{"type":"mcp_tool_call","status":"failed"}}',
        '{"type":"item.completed","item":{"type":"error","message":"warning"}}',
        '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":20,"cache_write_input_tokens":5,"output_tokens":30,"reasoning_output_tokens":7}}',
        "not-json",
      ].join("\n"),
    );

    expect(summary.events).toBe(5);
    expect(summary.invalidLines).toBe(1);
    expect(summary.completedTurns).toBe(1);
    expect(summary.toolCalls).toBe(2);
    expect(summary.toolFailures).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.usage).toEqual({
      inputTokens: 100,
      cachedInputTokens: 20,
      cacheWriteInputTokens: 5,
      outputTokens: 30,
      reasoningOutputTokens: 7,
      totalTokens: 130,
    });
  });
});
