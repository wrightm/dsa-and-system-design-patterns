import path from "node:path";
import { describe, expect, it } from "vitest";
import { tempDir, writeFiles } from "../../test/temp";
import { catalogueFiles, catalogueProgress, catalogueTitle } from "./catalogue";

const root = path.resolve(import.meta.dirname, "../../test/fixtures/repo");

describe("catalogueProgress", () => {
  it("counts ticked and unticked entries per file, skipping README", () => {
    expect(catalogueProgress(root)).toEqual([
      { file: "data-structures.md", title: "Data structures", done: 1, total: 3 },
    ]);
  });
});

describe("catalogueFiles", () => {
  it("is empty when there is no topics folder", () => {
    expect(catalogueFiles(tempDir("catalogue"))).toEqual([]);
  });

  it("lists the Markdown files other than README, sorted", () => {
    const root = tempDir("catalogue");
    writeFiles(root, { "topics/b.md": "", "topics/a.md": "", "topics/README.md": "", "topics/c.txt": "" });
    expect(catalogueFiles(root)).toEqual(["a.md", "b.md"]);
  });
});

describe("catalogueTitle", () => {
  it.each([
    ["# Data structures\n- [ ] x\n", "Data structures"],
    ["Plain first line  \nmore", "Plain first line"],
    ["", ""],
  ])("reads the first line of %j", (text, title) => {
    expect(catalogueTitle(text)).toBe(title);
  });
});
