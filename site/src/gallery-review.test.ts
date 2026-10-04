import {expect, test} from "bun:test";
import {validateGalleryReview} from "../../tools/gallery-review";

const review = () => ({generationModel:"test-model",generationReasoning:"medium",judgeModel:"gpt-6-astra",judgeReasoning:"medium",judgeCountPerPair:2, baselineMode:"vanilla", candidateMode:"plugin", regressionGate:{configurationMismatches:[]}, comparisons:[{
  taskId:"room", repetition:1, visualWinnerVotes:["plugin","plugin"], judgeResults:[
    {mapping:{A:"vanilla", B:"plugin"}, result:{winner:"B"}, decodedWinner:"plugin"},
    {mapping:{A:"plugin", B:"vanilla"}, result:{winner:"A"}, decodedWinner:"plugin"},
  ]}], missingComparisons:[]});

test("gallery admission verifies blinded mappings, task controls and decoded votes", () => {
  const valid = review();
  expect(validateGalleryReview(valid,"room","test-model")).toBe(valid.comparisons[0]);
  expect(() => validateGalleryReview(valid,"market","test-model")).toThrow("Wrong reviewed task");
  expect(() => validateGalleryReview(valid,"room","other-model")).toThrow("controls");
  expect(() => validateGalleryReview({...valid,judgeModel:"other-judge"},"room","test-model")).toThrow("controls");
  const swapped = review(); swapped.comparisons[0].judgeResults[1].mapping = {A:"vanilla", B:"plugin"};
  expect(() => validateGalleryReview(swapped,"room","test-model")).toThrow("mapping");
  const votes = review(); votes.comparisons[0].visualWinnerVotes = ["vanilla","vanilla"];
  expect(() => validateGalleryReview(votes,"room","test-model")).toThrow("votes differ");
});

test("unreviewed evidence needs an explicit missing record; no fabricated tie", () => {
  const missing = {...review(), comparisons:[], regressionGate:{configurationMismatches:[], missingComparisons:[{taskId:"room", repetition:1, reason:"contact-sheet evidence missing"}]}};
  expect(validateGalleryReview(missing,"room","test-model")).toBeNull();
  expect(() => validateGalleryReview({...missing, regressionGate:{...missing.regressionGate, missingComparisons:[]}},"room","test-model")).toThrow();
});
