import { describe, expect, test } from "bun:test";
import { computeVerifiedCompositeScore } from "./verified_score.ts";

const perfectDimensions = Object.fromEntries(
  [
    "taskFidelity",
    "silhouetteAndProportion",
    "constructionPlausibility",
    "craftsmanshipAndDetail",
    "materialsAndReadability",
    "surfaceFinishAndShading",
    "materialTextureQuality",
    "lightingAndPresentation",
    "finalStageCompleteness",
    "multiviewConsistency",
  ].map((key) => [key, 10]),
);

describe("computeVerifiedCompositeScore", () => {
  test("keeps a minimal technical foothold above ten percent", () => {
    const result = computeVerifiedCompositeScore({
      automatedScore: 20,
      hardGatePass: false,
      criteria: [
        { id: "critical", critical: true, passCount: 0, judgeCount: 3 },
      ],
      visualDimensions: {},
    });

    expect(result.score).toBe(12);
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  test("prevents a generic metric-perfect result from saturating", () => {
    const result = computeVerifiedCompositeScore({
      automatedScore: 100,
      hardGatePass: true,
      criteria: [
        { id: "parts", critical: true, passCount: 1, judgeCount: 3 },
        { id: "finish", critical: false, passCount: 2, judgeCount: 3 },
      ],
      visualDimensions: Object.fromEntries(
        Object.keys(perfectDimensions).map((key) => [key, 7]),
      ),
    });

    expect(result.score).toBeLessThanOrEqual(84);
    expect(result.gates.criticalMajorityPass).toBe(false);
  });

  test("reserves 100 for unanimous exceptional evidence", () => {
    const result = computeVerifiedCompositeScore({
      automatedScore: 100,
      hardGatePass: true,
      criteria: [
        { id: "parts", critical: true, passCount: 3, judgeCount: 3 },
        { id: "finish", critical: false, passCount: 3, judgeCount: 3 },
      ],
      visualDimensions: perfectDimensions,
    });

    expect(result.score).toBe(100);
    expect(result.caps).toEqual([]);
  });
});
