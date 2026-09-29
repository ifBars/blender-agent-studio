import {expect, test} from "bun:test";
import {preparePixabaySoundSearch} from "./pixabay.ts";

test("Pixabay handoff encodes sound queries without claiming live results", () => {
  const handoff = preparePixabaySoundSearch(" door & slam/#? ");
  expect(handoff.status).toBe("browser_required");
  expect(handoff.query).toBe("door & slam/#?");
  expect(handoff.url).toBe("https://pixabay.com/sound-effects/search/door%20%26%20slam%2F%23%3F/");
  expect(handoff.instructions.join(" ")).toContain("live sound-effect results");
  expect(() => preparePixabaySoundSearch("  ")).toThrow();
  expect(() => preparePixabaySoundSearch("a".repeat(201))).toThrow();
});
