import { describe, expect, test } from "bun:test";
import { pluginPrefix } from "./run_benchmark.ts";
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
