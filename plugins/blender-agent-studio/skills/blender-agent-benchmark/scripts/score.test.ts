import { describe, expect, test } from "bun:test";
import { scoreSubmission } from "./score.ts";
import { BENCHMARK_TASKS } from "./tasks.ts";

const lantern = BENCHMARK_TASKS.find((task) => task.id === "signal_lantern")!;

function completeMetrics() {
  return {
    hard_gate_pass: true,
    materials: ["metal", "glass", "light", "trim"],
    meshes: [
      { name: "Base" },
      { name: "Body" },
      { name: "Glass_Chamber" },
      { name: "Flame_Emitter" },
      { name: "Top_Cap" },
      { name: "Handle" },
      { name: "Handle_Mount_L" },
      { name: "Handle_Mount_R" },
    ],
    objects: [
      { name: "Base", parent: null },
      { name: "Body", parent: "Base" },
      { name: "Glass_Chamber", parent: "Body" },
      { name: "Flame_Emitter", parent: "Body" },
      { name: "Top_Cap", parent: "Body" },
      { name: "Handle", parent: "Body" },
      { name: "Handle_Mount_L", parent: "Body" },
      { name: "Handle_Mount_R", parent: "Body" },
    ],
    actions: [],
    scene: { bounds: { dimensions: [1.2, 0.9, 2.1] } },
    totals: {
      triangles: 4200,
      mesh_objects: 8,
      materials: 4,
      invalid_vertices: 0,
      degenerate_faces: 0,
      zero_length_edges: 0,
      smooth_polygons: 3_000,
      flat_polygons: 1_200,
      uv_mapped_meshes: 8,
      refinement_modifiers: 2,
    },
  };
}

describe("scoreSubmission", () => {
  test("awards a complete structurally valid submission", () => {
    const score = scoreSubmission({
      task: lantern,
      agentExitCode: 0,
      sourceExists: true,
      reproductionPass: true,
      blendExists: true,
      glbExists: true,
      blendMetrics: completeMetrics(),
      glbMetrics: completeMetrics(),
    });

    expect(score.hardGatePass).toBe(true);
    expect(score.score).toBe(100);
  });

  test("preserves partial specification credit but fails missing export gates", () => {
    const metrics = completeMetrics();
    metrics.meshes = [{ name: "Base" }, { name: "Body" }];
    metrics.objects = [
      { name: "Base", parent: null },
      { name: "Body", parent: "Base" },
    ];
    const score = scoreSubmission({
      task: lantern,
      agentExitCode: 0,
      sourceExists: true,
      reproductionPass: false,
      blendExists: true,
      glbExists: false,
      blendMetrics: metrics,
      glbMetrics: null,
    });

    expect(score.hardGatePass).toBe(false);
    expect(score.dimensions.specificationCoverage).toBeCloseTo(8.33, 2);
    expect(score.score).toBeLessThan(100);
  });

  test("does not award a perfect score to an unrefined blockout", () => {
    const metrics = completeMetrics();
    metrics.totals.smooth_polygons = 0;
    metrics.totals.flat_polygons = 4_200;
    metrics.totals.uv_mapped_meshes = 0;
    metrics.totals.refinement_modifiers = 0;
    metrics.totals.triangles = 1_300;

    const score = scoreSubmission({
      task: lantern,
      agentExitCode: 0,
      sourceExists: true,
      reproductionPass: true,
      blendExists: true,
      glbExists: true,
      blendMetrics: metrics,
      glbMetrics: completeMetrics(),
    });

    expect(score.hardGatePass).toBe(true);
    expect(score.dimensions.finishQuality).toBe(0);
    expect(score.score).toBe(89);
  });

  test("preserves intentional low-poly finish requirements", () => {
    const lowPolyTask = BENCHMARK_TASKS.find(
      (task) => task.id === "low_poly_radio_control",
    )!;
    const metrics = completeMetrics();
    metrics.objects = [
      { name: "Body", parent: null },
      { name: "Speaker_Grille", parent: "Body" },
      { name: "Tuning_Display", parent: "Body" },
      { name: "Knob_A", parent: "Body" },
      { name: "Knob_B", parent: "Body" },
      { name: "Handle", parent: "Body" },
      { name: "Antenna", parent: "Body" },
      { name: "Corner_Guard", parent: "Body" },
      { name: "Battery_Compartment", parent: "Body" },
    ];
    metrics.totals.mesh_objects = 9;
    metrics.totals.materials = 3;
    metrics.totals.triangles = 1_200;
    metrics.totals.smooth_polygons = 100;
    metrics.totals.flat_polygons = 1_100;
    metrics.totals.uv_mapped_meshes = 9;
    metrics.totals.refinement_modifiers = 0;
    metrics.scene.bounds.dimensions = [0.8, 0.4, 0.5];

    const score = scoreSubmission({
      task: lowPolyTask,
      agentExitCode: 0,
      sourceExists: true,
      reproductionPass: true,
      blendExists: true,
      glbExists: true,
      blendMetrics: metrics,
      glbMetrics: metrics,
    });

    expect(score.hardGatePass).toBe(true);
    expect(score.dimensions.finishQuality).toBe(11);
    expect(score.score).toBe(100);
  });
});
