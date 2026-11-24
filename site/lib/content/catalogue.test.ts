import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogueProgress } from "./catalogue";

const root = path.resolve(import.meta.dirname, "../../test/fixtures/repo");

describe("catalogueProgress", () => {
  it("counts ticked and unticked entries per file, skipping README", () => {
    expect(catalogueProgress(root)).toEqual([
      { file: "data-structures.md", title: "Data structures", done: 1, total: 3 },
    ]);
  });
});
