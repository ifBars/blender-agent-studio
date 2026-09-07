import { describe, expect, test } from "bun:test";
import { buildCodexArgs, pluginPrefix } from "./run_benchmark.ts";
import { resolveModelOptions } from "./model-options.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";

describe("pluginPrefix", () => {
  test("loads iterative refinement only for the opt-in gauntlet", () => {
    const gauntlet = BENCHMARK_TASKS.find(
      (task) => task.id === "lunar_sample_cell_gauntlet",
    )!;
    const historical = BENCHMARK_TASKS.find(
      (task) => task.id === "winch_drawbridge",
    )!;

    expect(pluginPrefix("skills", gauntlet)).toContain(
      "$blender-agent-studio:blender-iterative-refinement",
    );
    expect(pluginPrefix("skills", historical)).not.toContain(
      "blender-iterative-refinement",
    );
  });

  test("loads animation, rendering, and refinement for the fire lantern", () => {
    const task = BENCHMARK_TASKS.find(
      (item) => item.id === "realistic_fire_lantern_showcase",
    )!;
    const prefix = pluginPrefix("skills", task);
    expect(prefix).toContain("$blender-agent-studio:blender-animation-workflow");
    expect(prefix).toContain("$blender-agent-studio:blender-rendering-workflow");
    expect(prefix).toContain("$blender-agent-studio:blender-iterative-refinement");
  });
});

describe("benchmark model selection", () => {
  test("pins Astra without increasing the comparison effort", () => {
    expect(resolveModelOptions({ profile: "astra" })).toEqual({
      model: "gpt-6-astra", reasoning: "medium", modelProfile: "astra",
    });
    expect(resolveModelOptions({ profile: "astra", reasoning: "high" }).reasoning).toBe("high");
  });

  test("keeps the configured default and all three earlier models available", () => {
    expect(resolveModelOptions({})).toEqual({ model: undefined, reasoning: "medium", modelProfile: null });
    for (const profile of ["sol", "terra", "luna"]) {
      expect(resolveModelOptions({ profile }).model).toBe(`gpt-5.6-${profile}`);
    }
    expect(resolveModelOptions({ model: "custom-model", reasoning: "low" }).model).toBe("custom-model");
  });

  test("rejects incompatible settings instead of silently changing a comparison", () => {
    for (const reasoning of ["none", "minimal", "typo"]) {
      expect(() => resolveModelOptions({ profile: "astra", reasoning })).toThrow("Unsupported reasoning effort");
      expect(() => resolveModelOptions({ model: "gpt-6-astra", reasoning })).toThrow("Unsupported reasoning effort");
    }
    expect(() => resolveModelOptions({ profile: "luna", reasoning: "ultra" })).toThrow();
    expect(() => resolveModelOptions({ profile: "toString" })).toThrow("Unsupported model profile");
    expect(() => resolveModelOptions({ profile: "astra", model: "gpt-5.6-terra" })).toThrow("conflicting");
    expect(resolveModelOptions({ profile: "astra", model: "gpt-6-astra", reasoning: "ultra" }).reasoning).toBe("ultra");
  });
});

describe("benchmark execution isolation", () => {
  const base = {
    cwd: "C:/bench/example", prompt: "build the asset", reasoning: "medium",
    timeoutMs: 1000, bypassApprovals: false, skillRootPinned: false,
    model: "gpt-6-astra",
  };

  test("isolates a labeled baseline and passes Astra to Codex", () => {
    const options = { ...base, mode: "baseline" as const, conditionLabel: "astra-before" };
    const args = buildCodexArgs(options);
    expect(args).toContain("--ignore-user-config");
    expect(args).toContain("--ignore-rules");
    expect(args[args.indexOf("--model") + 1]).toBe("gpt-6-astra");
    expect(args).toContain('model_reasoning_effort="medium"');
    expect(args).not.toContain("astra-before");
    expect(args.at(-1)).toBe("-");
  });

  test("loads installed skills only for an unpinned plugin condition", () => {
    expect(buildCodexArgs({ ...base, mode: "skills" })).not.toContain("--ignore-user-config");
    expect(buildCodexArgs({ ...base, mode: "skills", skillRootPinned: true })).toContain("--ignore-user-config");
  });

  test("does not expand permissions when selecting a model", () => {
    const args = buildCodexArgs({ ...base, mode: "baseline" });
    expect(args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(buildCodexArgs({ ...base, mode: "baseline", bypassApprovals: true })).toContain("--dangerously-bypass-approvals-and-sandbox");
  });
});
