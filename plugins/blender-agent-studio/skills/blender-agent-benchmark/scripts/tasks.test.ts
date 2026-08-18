import { describe, expect, test } from "bun:test";
import { BENCHMARK_TASKS } from "./tasks.ts";

describe("benchmark task coverage", () => {
  test("preserves the historical full-suite task set", () => {
    expect(
      BENCHMARK_TASKS.filter((task) => task.suites.includes("full")).map(
        (task) => task.id,
      ),
    ).toEqual([
      "signal_lantern",
      "tabletop_press",
      "winch_drawbridge",
      "foot_pump_holdout",
      "ceramic_lamp_finish_holdout",
      "low_poly_radio_control",
    ]);
  });

  test("adds isolated harder category coverage with explicit visual criteria", () => {
    const challenge = BENCHMARK_TASKS.filter((task) =>
      task.suites.includes("challenge"),
    );
    expect(new Set(challenge.map((task) => task.category))).toEqual(
      new Set([
        "environment_creation",
        "procedural_creation",
        "character_creation",
        "simulation_creation",
        "animation_creation",
      ]),
    );
    expect(challenge.every((task) => task.visualCriteria.length >= 4)).toBe(true);
    expect(challenge.every((task) => task.rubric.categorySignals?.length)).toBe(
      true,
    );
  });

  test("adds a realistic fire-lantern video task without changing full", () => {
    const task = BENCHMARK_TASKS.find(
      (item) => item.id === "realistic_fire_lantern_showcase",
    )!;
    expect(task.suites).toEqual(["challenge"]);
    expect(task.animationFrames).toEqual([1, 90, 180, 270, 360]);
    expect(task.requiredVideo).toEqual({
      filename: "lamp_fire_15s.mp4",
      durationSeconds: 15,
      fps: 24,
      toleranceSeconds: 0.25,
    });
    expect(task.requireIterationReview).toBe(true);
    expect(task.rubric.minimumActionSpan).toBe(359);
    expect(
      task.visualCriteria.some(
        (criterion) => criterion.category === "deformation" && criterion.critical,
      ),
    ).toBe(true);
  });

  test("keeps the integrated gauntlet isolated and intentionally unsaturated", () => {
    const gauntlet = BENCHMARK_TASKS.filter((task) =>
      task.suites.includes("gauntlet"),
    );
    expect(gauntlet).toHaveLength(1);
    expect(gauntlet[0].id).toBe("lunar_sample_cell_gauntlet");
    expect(gauntlet[0].difficultyProfile).toBe("gauntlet");
    expect(gauntlet[0].suites).toEqual(["gauntlet"]);
    expect(gauntlet[0].visualCriteria.length).toBeGreaterThanOrEqual(12);
    expect(
      gauntlet[0].visualCriteria.filter((criterion) => criterion.critical).length,
    ).toBeGreaterThanOrEqual(8);
    expect(gauntlet[0].rubric.requiredNameGroups.length).toBeGreaterThanOrEqual(
      20,
    );
    expect(gauntlet[0].rubric.categorySignals?.length).toBeGreaterThanOrEqual(
      8,
    );
  });

  test("gives every task unique structured visual criteria", () => {
    for (const task of BENCHMARK_TASKS) {
      const ids = task.visualCriteria.map((criterion) => criterion.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
      expect(task.visualCriteria.some((criterion) => criterion.critical)).toBe(
        true,
      );
    }
  });
});
