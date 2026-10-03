import { expect, test } from "bun:test";
import { splitPosition } from "./comparison";

test("pointer split uses the image bounds and clamps drag beyond either edge", () => {
  expect(splitPosition(350, 100, 500)).toBe(50);
  expect(splitPosition(50, 100, 500)).toBe(0);
  expect(splitPosition(700, 100, 500)).toBe(100);
  expect(splitPosition(100, 100, 0)).toBe(50);
});
