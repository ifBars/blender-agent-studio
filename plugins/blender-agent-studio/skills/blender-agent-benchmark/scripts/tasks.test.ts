import { describe, expect, test } from "bun:test";
import { BENCHMARK_TASKS } from "./tasks.ts";
import { scoreSubmission } from "./score.ts";

describe("benchmark task coverage", () => {
  test("adds complete scenes and static/rigged game characters with independent holdouts", () => {
    const scenes = BENCHMARK_TASKS.filter(t=>t.suites.includes('scenes'));
    const characters = BENCHMARK_TASKS.filter(t=>t.suites.includes('game_characters'));
    expect(scenes).toHaveLength(3);
    expect(characters).toHaveLength(4);
    expect(scenes.filter(t=>t.renderOnly)).toHaveLength(2);
    expect(scenes.every(t=>t.authoredCameras?.length === 3 && t.visualCriteria.length >= 6)).toBe(true);
    expect(characters.filter(t=>t.motionRequirement?.inspectExport)).toHaveLength(2);
    expect(characters.filter(t=>!t.rubric.requireAnimation)).toHaveLength(2);
    expect([...scenes,...characters].every(t=>t.suites.length===1 && !t.suites.includes('full'))).toBe(true);
    expect(scenes.some(t=>t.id.endsWith('holdout'))).toBe(true);
    expect(characters.some(t=>t.id.endsWith('holdout'))).toBe(true);
  });
  test("cartoon outfit regression requires motion, export and style-preserving attachment evidence", () => {
    const task = BENCHMARK_TASKS.find(t => t.id === "cartoon_outfit_motion")!;
    expect(task.motionRequirement?.inspectExport).toBe(true);
    expect(task.motionRequirement?.frames).toEqual(task.animationFrames);
    expect(task.requiredVideo).toEqual({filename:"walk.mp4",durationSeconds:2,fps:24,toleranceSeconds:0.1});
    expect(task.rubric.requiredNameGroups).toEqual([["CartoonBody"]]);
    expect(task.rubric.minimumMeshObjects).toBe(1);
    for (const id of ["cartoon_style", "cartoon_ankles", "cartoon_accessories", "cartoon_joints"]) {
      expect(task.visualCriteria.find(c => c.id === id)?.critical).toBe(true);
    }
    expect(task.suites).not.toContain("full");
  });
  test("an integrated cartoon outfit does not fail object-name or mesh-count gates", () => {
    const task = BENCHMARK_TASKS.find(t => t.id === "cartoon_outfit_motion")!;
    const options = { task, agentExitCode: 0, sourceExists: true, reproductionPass: true,
      blendExists: true, glbExists: true, blendMetrics: {
        objects: [{ name: "CartoonBody" }], totals: { mesh_objects: 1 },
      } };
    const result = scoreSubmission(options);
    for (const id of ["semantic_part_coverage", "mesh_object_count"]) {
      expect(result.checks.find(check => check.id === id)?.passed).toBe(true);
    }
    const missingBody = scoreSubmission({ ...options, blendMetrics: { objects: [{ name: "Other" }] } });
    expect(missingBody.checks.find(check => check.id === "semantic_part_coverage")?.passed).toBe(false);
  });
  test("separates quality and reference suites from historical tasks", () => {
    const quality=BENCHMARK_TASKS.filter(task=>task.suites.includes("quality"));
    expect(quality).toHaveLength(5);
    expect(quality.filter(t=>t.motionRequirement)).toHaveLength(4);
    expect(quality.every(t=>t.suites.length===1)).toBe(true);
    const reference=BENCHMARK_TASKS.filter(t=>t.suites.includes("reference"));
    expect(reference).toHaveLength(1);
    expect(reference[0].referenceFiles).toEqual(["reference-front.png","reference-side.png"]);
    for(const task of quality.filter(t=>t.category==="simulation_creation")) {
      expect(task.rubric.requireAnimation).toBe(false);
      expect(task.requiredVideo).toBeDefined();
      expect(task.motionRequirement).toBeDefined();
    }
  });
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
