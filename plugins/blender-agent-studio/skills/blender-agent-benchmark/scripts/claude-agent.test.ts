import { expect, test } from "bun:test";
import { buildClaudeArgs, summarizeClaudeEvents } from "./claude-agent.ts";
import { SPATIAL_TASKS } from "./spatial-tasks.ts";

test("Claude isolation preserves explicit model and rejects unvalidated MCP conditions", () => {
  const options = { model: "claude-opus-5-5", reasoning: "medium", mode: "skills", bypassApprovals: false };
  const args = buildClaudeArgs(options);
  expect(args).toContain("--safe-mode");
  expect(args).not.toContain("--bare");
  expect(args).toContain("claude-opus-5-5");
  expect(args).not.toContain("--dangerously-skip-permissions");
  expect(() => buildClaudeArgs({ ...options, mode: "skills_mcp" })).toThrow("not yet validated");
  expect(() => buildClaudeArgs({ ...options, model: undefined })).toThrow("explicit");
  expect(() => buildClaudeArgs({ ...options, reasoning: "ultra" })).toThrow("effort");
});

test("Claude trace separates cached usage, tool failures and actual model", () => {
  const trace = summarizeClaudeEvents([
    { type: "system", subtype: "init", model: "claude-sonnet-5-5" },
    { type: "assistant", message: { model: "claude-sonnet-5-5", content: [{ type: "tool_use", name: "Read" }] } },
    { type: "user", message: { content: [{ type: "tool_result", is_error: true }] } },
    { type: "result", subtype: "success", num_turns: 2, total_cost_usd: 0.5, usage: { input_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 30, output_tokens: 40 } },
  ].map(e => JSON.stringify(e)).join("\n") + "\ninvalid");
  expect(trace.observedModels).toEqual(["claude-sonnet-5-5"]);
  expect(trace.toolCalls).toBe(1);
  expect(trace.toolFailures).toBe(1);
  expect(trace.invalidLines).toBe(1);
  expect(trace.usage.totalTokens).toBe(100);
  expect(trace.reportedCostUsd).toBe(0.5);
});

test("spatial fixtures distinguish required contact from intended negative space", () => {
  expect(SPATIAL_TASKS).toHaveLength(2);
  for (const task of SPATIAL_TASKS) {
    expect(task.suites).toEqual(["spatial"]);
    expect(task.visualCriteria.filter(c => c.critical).length).toBeGreaterThanOrEqual(5);
    expect(task.prompt).not.toContain("spatial_review.json");
  }
});
