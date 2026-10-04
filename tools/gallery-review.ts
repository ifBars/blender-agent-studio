/** Admit a completed, counterbalanced review or an explicitly missing-evidence result. */
export function validateGalleryReview(review: any, task: string, model: string): any | null {
  if (review.regressionGate?.configurationMismatches?.length !== 0 || review.generationModel !== model || review.generationReasoning !== "medium" || review.judgeModel !== "gpt-6-astra" || review.judgeReasoning !== "medium" || review.judgeCountPerPair !== 2 || review.baselineMode !== "vanilla" || review.candidateMode !== "plugin")
    throw new Error("Review controls or model differ");
  if (!Array.isArray(review.comparisons)) throw new Error("Missing review comparisons");
  if (review.comparisons.length === 0 && review.regressionGate.missingComparisons?.some((entry: any) => entry.taskId === task && entry.repetition === 1)) return null;
  const comparison = review.comparisons[0];
  if (review.comparisons.length !== 1 || comparison.taskId !== task || comparison.repetition !== 1) throw new Error("Wrong reviewed task or repetition");
  const judges = comparison.judgeResults;
  if (!Array.isArray(judges) || judges.length !== 2 || judges[0].mapping.A !== judges[1].mapping.B || judges.some((judge: any) => {
    const {A, B} = judge.mapping;
    return A === B || ![A,B].includes("vanilla") || ![A,B].includes("plugin") || !["A","B","tie"].includes(judge.result.winner) || judge.decodedWinner !== (judge.result.winner === "tie" ? "tie" : judge.mapping[judge.result.winner]);
  })) throw new Error("Invalid counterbalanced judge mapping");
  if (JSON.stringify(comparison.visualWinnerVotes) !== JSON.stringify(judges.map((judge: any) => judge.decodedWinner))) throw new Error("Preference votes differ from blinded judgments");
  return comparison;
}
