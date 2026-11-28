import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tempDir, writeFiles } from "../../test/temp";
import { catalogueFiles, catalogueProgress, catalogueTitle } from "./catalogue";

const root = path.resolve(import.meta.dirname, "../../test/fixtures/repo");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalogueProgress", () => {
  it("counts ticked and unticked entries per file, skipping README", () => {
    expect(catalogueProgress(root)).toEqual([
      { file: "data-structures.md", title: "Data structures", done: 1, total: 3 },
    ]);
  });

  it("counts only checkboxes that start a list item", () => {
    const dir = tempDir("catalogue");
    writeFiles(dir, {
      "topics/a.md": "# A\n- [x] one\n- [ ] two\nSee - [x] in a sentence, and  - [ ] indented.\n",
    });
    expect(catalogueProgress(dir)).toEqual([{ file: "a.md", title: "A", done: 1, total: 2 }]);
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

  it("sorts whatever order the folder is listed in", () => {
    const root = tempDir("catalogue");
    writeFiles(root, { "topics/a.md": "", "topics/b.md": "", "topics/c.md": "" });
    const list = fs.readdirSync;
    vi.spyOn(fs, "readdirSync").mockImplementation(((dir: fs.PathLike) =>
      (list(dir) as string[]).reverse()) as typeof fs.readdirSync);
    expect(catalogueFiles(root)).toEqual(["a.md", "b.md", "c.md"]);
  });
});

describe("catalogueTitle", () => {
  it.each([
    ["# Data structures\n- [ ] x\n", "Data structures"],
    ["Plain first line  \nmore", "Plain first line"],
    ["", ""],
    ["Not # a heading", "Not # a heading"],
  ])("reads the first line of %j", (text, title) => {
    expect(catalogueTitle(text)).toBe(title);
  });
});
