export type VerifiedCriterion = {
  id: string;
  critical: boolean;
  passCount: number;
  judgeCount: number;
};

export function computeVerifiedCompositeScore(options: {
  automatedScore: number;
  hardGatePass: boolean;
  criteria: VerifiedCriterion[];
  visualDimensions: Record<string, number | null>;
}) {
  const automated = Math.max(0, Math.min(100, options.automatedScore));
  const criterionPasses = options.criteria.reduce(
    (sum, criterion) => sum + criterion.passCount,
    0,
  );
  const criterionOpportunities = options.criteria.reduce(
    (sum, criterion) => sum + criterion.judgeCount,
    0,
  );
  const criterionRate = criterionOpportunities
    ? criterionPasses / criterionOpportunities
    : 0;
  const visualValues = Object.values(options.visualDimensions).filter(
    (value): value is number => Number.isFinite(value),
  );
  const visualMean = visualValues.length
    ? visualValues.reduce((sum, value) => sum + value, 0) / visualValues.length
    : 0;

  const criticalMajorityPass = options.criteria
    .filter((criterion) => criterion.critical)
    .every((criterion) => criterion.passCount > criterion.judgeCount / 2);
  const allMajorityPass = options.criteria.every(
    (criterion) => criterion.passCount > criterion.judgeCount / 2,
  );
  const allUnanimousPass =
    options.criteria.length > 0 &&
    options.criteria.every(
      (criterion) => criterion.passCount === criterion.judgeCount,
    );
  const allVisualDimensionsExceptional =
    visualValues.length > 0 && visualValues.every((value) => value >= 9.5);

  const components = {
    automated: automated * 0.6,
    structuredVisual: criterionRate * 25,
    broadVisual: Math.max(0, Math.min(10, visualMean)) * 1.5,
  };
  let score =
    components.automated +
    components.structuredVisual +
    components.broadVisual;
  const caps: Array<{ reason: string; maximum: number }> = [];
  if (!options.hardGatePass) {
    caps.push({ reason: "deterministic hard gate failed", maximum: 49 });
  }
  if (!criticalMajorityPass) {
    caps.push({ reason: "critical visual criterion lacks a passing majority", maximum: 84 });
  }
  if (!allMajorityPass) {
    caps.push({ reason: "visual criterion lacks a passing majority", maximum: 94 });
  }
  if (
    automated < 100 ||
    !allUnanimousPass ||
    !allVisualDimensionsExceptional
  ) {
    caps.push({
      reason:
        "100 requires perfect deterministic score, unanimous criteria, and every broad visual dimension at least 9.5",
      maximum: 99,
    });
  }
  for (const cap of caps) {
    score = Math.min(score, cap.maximum);
  }

  return {
    score: Number(score.toFixed(2)),
    components: {
      automated: Number(components.automated.toFixed(2)),
      structuredVisual: Number(components.structuredVisual.toFixed(2)),
      broadVisual: Number(components.broadVisual.toFixed(2)),
    },
    criterionRate: Number(criterionRate.toFixed(4)),
    visualMean: Number(visualMean.toFixed(3)),
    gates: {
      hardGatePass: options.hardGatePass,
      criticalMajorityPass,
      allMajorityPass,
      allUnanimousPass,
      allVisualDimensionsExceptional,
    },
    caps,
  };
}
