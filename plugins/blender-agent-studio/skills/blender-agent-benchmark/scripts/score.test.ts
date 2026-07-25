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
    expect(score.dimensions.specificationCoverage).toBe(10);
    expect(score.score).toBeLessThan(100);
  });
});
