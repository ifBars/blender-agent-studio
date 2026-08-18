import { describe, expect, test } from "bun:test";
import { assessNonRegression } from "./compare_runs.ts";

const comparison = {
  taskId: "signal_lantern",
  repetition: 1,
  baselineAutomatedScore: 100,
  candidateAutomatedScore: 100,
  hardGates: { baseline: true, candidate: true },
  visualWinnerVotes: ["candidate", "tie", "candidate"],
  criticalCriterionMajorities: [
    {
      criterionId: "lantern_handle_attachment",
      baselinePasses: 3,
      candidatePasses: 3,
      judgeCount: 3,
    },
  ],
};

describe("assessNonRegression", () => {
  test("passes a complete candidate that preserves gates, score, and visible criteria", () => {
    const result = assessNonRegression({
      comparisons: [comparison],
      missingComparisons: [],
      baselineMode: "original",
      candidateMode: "candidate",
    });

    expect(result.pass).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  test("fails missing comparisons and independent technical or visual regressions", () => {
    const result = assessNonRegression({
      comparisons: [
        {
          ...comparison,
          candidateAutomatedScore: 99,
          hardGates: { baseline: true, candidate: false },
          visualWinnerVotes: ["original", "original", "candidate"],
          criticalCriterionMajorities: [
            {
              criterionId: "lantern_handle_attachment",
              baselinePasses: 3,
              candidatePasses: 1,
              judgeCount: 3,
            },
          ],
        },
      ],
      missingComparisons: [
        { taskId: "tabletop_press", repetition: 1, reason: "candidate result missing" },
      ],
      configurationMismatches: ["scorer version differs: 3 vs 4"],
      baselineMode: "original",
      candidateMode: "candidate",
    });

    expect(result.pass).toBe(false);
    expect(result.missingComparisons).toHaveLength(1);
    expect(result.configurationMismatches).toHaveLength(1);
    expect(result.hardGateRegressions).toHaveLength(1);
    expect(result.automatedScoreRegressions).toHaveLength(1);
    expect(result.visualMajorityRegressions).toHaveLength(1);
    expect(result.criticalCriterionRegressions).toHaveLength(1);
  });
});
