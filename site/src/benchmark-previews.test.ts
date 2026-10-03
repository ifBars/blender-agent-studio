import { expect, test } from "bun:test";
import { validatePreviewPaths } from "../../tools/fetch-benchmark-previews";

test("published gallery paths stay inside the preview directory", () => {
  expect(() => validatePreviewPaths(["benchmarks/", "benchmarks/spatial-pilot.json", "benchmarks/task/model/current/front.png"])).not.toThrow();
  for (const path of ["/tmp/file.png", "benchmarks/../file.png", "benchmarks/a/../../file.png", "benchmarks\\file.png", "other/file.json", "benchmarks/script.exe"])
    expect(() => validatePreviewPaths([path])).toThrow();
  expect(() => validatePreviewPaths([])).toThrow();
});
