import path from "node:path";
import { describe, expect, it } from "vitest";
import { tempDir, writeFiles } from "../../test/temp";
import { findArticles, MODULES, pagePath, splitFrontMatter } from "./articles";

const fixtures = path.resolve(import.meta.dirname, "../../test/fixtures");

describe("findArticles", () => {
  it("returns only published articles", () => {
    const articles = findArticles(path.join(fixtures, "repo"));
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      module: "data-structures",
      slug: "hashmap",
      title: "Hash map: a fixture",
      summary: "A fixture article.",
      date: "2026-11-18",
      series: 1,
      tags: ["data-structures", "hashing"],
      sourcePath: "data-structures/src/main/java/learn/ds/hashmap/README.md",
    });
    expect(articles[0]!.body).toContain("# Hash map: a fixture");
    expect(articles[0]!.body).not.toContain("status: published");
  });

  it("names the file when a published article lacks a summary", () => {
    expect(() => findArticles(path.join(fixtures, "bad-summary"))).toThrow(
      /data-structures\/src\/main\/java\/learn\/ds\/thing\/README\.md: published but missing summary/,
    );
  });

  it("has the module table", () => {
    expect(Object.keys(MODULES)).toHaveLength(11);
    expect(MODULES["data-structures"]).toEqual({
      title: "Data structures",
      description: "Structures built from scratch, each compared with the JDK or library version.",
      catalogue: "data-structures.md",
    });
    expect(MODULES["challenges"]!.catalogue).toBeNull();
  });
});

describe("splitFrontMatter", () => {
  it("parses the YAML block and returns the rest as the body", () => {
    expect(splitFrontMatter("---\ntitle: T\n---\nbody\n")).toEqual({ meta: { title: "T" }, body: "body\n" });
  });

  it("treats text with no front matter as all body", () => {
    expect(splitFrontMatter("# Title\n")).toEqual({ meta: {}, body: "# Title\n" });
  });

  it("treats an empty block as no fields", () => {
    expect(splitFrontMatter("---\n\n---\nbody")).toEqual({ meta: {}, body: "body" });
  });
});

describe("pagePath", () => {
  it("is the module folder and the slug", () => {
    expect(pagePath({ module: "algorithms", slug: "sort" })).toBe("algorithms/sort.md");
  });
});

describe("findArticles in a made-up repo", () => {
  const article = (fields: string) => `---\nstatus: published\ntitle: T\nsummary: S\ndate: 2026-01-01\n${fields}\n---\n# T\n`;
  const repo = (files: Record<string, string>) => {
    const root = tempDir("articles");
    writeFiles(root, files);
    return root;
  };

  it("reads tags that are not a list as no tags, and numbers as text", () => {
    const root = repo({ "algorithms/src/main/java/a/sort/README.md": article("series: 3\ntags: sorting") });
    expect(findArticles(root)).toEqual([
      expect.objectContaining({ module: "algorithms", slug: "sort", series: 3, tags: [], date: "2026-01-01" }),
    ]);
    const listed = repo({ "algorithms/src/main/java/a/sort/README.md": article("series: 3\ntags: [1, b]") });
    expect(findArticles(listed)[0]!.tags).toEqual(["1", "b"]);
  });

  it("finds nothing in a repo with no modules, and skips READMEs that are not published", () => {
    expect(findArticles(repo({ "README.md": "# Repo\n" }))).toEqual([]);
    expect(findArticles(repo({ "algorithms/src/main/java/a/README.md": "# Notes\n" }))).toEqual([]);
  });

  it("names every missing field", () => {
    const root = repo({ "algorithms/src/main/java/a/README.md": "---\nstatus: published\n---\n" });
    expect(() => findArticles(root)).toThrow(
      new Error("algorithms/src/main/java/a/README.md: published but missing title, summary, date, series"),
    );
  });

  it("rejects two articles that would share a page", () => {
    const root = repo({
      "algorithms/src/main/java/a/sort/README.md": article("series: 1"),
      "algorithms/src/main/java/b/sort/README.md": article("series: 2"),
    });
    expect(() => findArticles(root)).toThrow(new Error("two articles map to the same page: algorithms/sort.md"));
  });

  it("rejects a series number used twice, listing each once", () => {
    const root = repo({
      "algorithms/src/main/java/a/README.md": article("series: 1"),
      "algorithms/src/main/java/b/README.md": article("series: 1"),
      "algorithms/src/main/java/c/README.md": article("series: 1"),
      "concurrency/src/main/java/d/README.md": article("series: 2"),
      "concurrency/src/main/java/e/README.md": article("series: 2"),
    });
    expect(() => findArticles(root)).toThrow(new Error("series numbers used more than once: 1, 2"));
  });
});
