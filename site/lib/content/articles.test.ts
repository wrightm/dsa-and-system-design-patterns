import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REPO_ROOT } from "../../test/repo-root";
import { tempDir, writeFiles } from "../../test/temp";
import { findArticles, MODULES, pagePath, splitFrontMatter } from "./articles";
import { catalogueTitle } from "./catalogue";

afterEach(() => {
  vi.restoreAllMocks();
});

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

  // Checked against the repository itself, so the table cannot drift from the catalogue.
  it.each(Object.entries(MODULES).filter(([, info]) => info.catalogue !== null))(
    "names %s's catalogue, which lists the module and is titled after it",
    (module, info) => {
      expect(info.catalogue).toBe(`${module}.md`);
      const readme = fs.readFileSync(path.join(REPO_ROOT, "topics/README.md"), "utf8");
      expect(readme).toContain(`](${info.catalogue}) | \`${module}/\` |`);
      const heading = catalogueTitle(fs.readFileSync(path.join(REPO_ROOT, "topics", info.catalogue!), "utf8"));
      expect(info.title).not.toBe("");
      expect(heading.startsWith(info.title)).toBe(true);
    },
  );

  it.each(Object.entries(MODULES))("describes %s in one sentence", (_module, info) => {
    expect(info.title).toMatch(/^[A-Z][a-z -]+$/);
    expect(info.description).toMatch(/^[A-Z].{20,}\.$/);
  });
});

describe("splitFrontMatter", () => {
  it("parses the YAML block and returns the rest as the body", () => {
    expect(splitFrontMatter("---\ntitle: T\n---\nbody\n")).toEqual({ meta: { title: "T" }, body: "body\n" });
  });

  it("treats text with no front matter as all body", () => {
    expect(splitFrontMatter("# Title\n")).toEqual({ meta: {}, body: "# Title\n" });
  });

  it("reads front matter only at the very start", () => {
    const text = "# Title\n---\ntitle: T\n---\nbody\n";
    expect(splitFrontMatter(text)).toEqual({ meta: {}, body: text });
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

  it("reads only README.md files under src/main/java", () => {
    const root = repo({
      "algorithms/src/main/java/a/NOTES.md": article("series: 1"),
      "algorithms/src/main/resources/b/README.md": article("series: 2"),
      "algorithms/src/test/java/c/README.md": article("series: 3"),
      "algorithms/src/main/java/d/README.md": article("series: 4"),
    });
    expect(findArticles(root).map((a) => a.slug)).toEqual(["d"]);
  });

  it("returns a module's articles in path order, whatever order the folders are listed in", () => {
    const root = repo({
      "algorithms/src/main/java/a/README.md": article("series: 1"),
      "algorithms/src/main/java/b/README.md": article("series: 2"),
      "algorithms/src/main/java/c/README.md": article("series: 3"),
    });
    const list = fs.readdirSync;
    vi.spyOn(fs, "readdirSync").mockImplementation(((dir: fs.PathLike, options: never) =>
      (list(dir, options) as unknown[]).reverse()) as typeof fs.readdirSync);
    expect(findArticles(root).map((a) => a.slug)).toEqual(["a", "b", "c"]);
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

  it("lists every shared page, in order", () => {
    const root = repo({
      "algorithms/src/main/java/a/tree/README.md": article("series: 1"),
      "algorithms/src/main/java/b/tree/README.md": article("series: 2"),
      "algorithms/src/main/java/c/sort/README.md": article("series: 3"),
      "algorithms/src/main/java/d/sort/README.md": article("series: 4"),
    });
    expect(() => findArticles(root)).toThrow(
      new Error("two articles map to the same page: algorithms/sort.md, algorithms/tree.md"),
    );
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

  it("lists repeated series numbers in order, whichever is found first", () => {
    const root = repo({
      "algorithms/src/main/java/a/README.md": article("series: 3"),
      "algorithms/src/main/java/b/README.md": article("series: 3"),
      "algorithms/src/main/java/c/README.md": article("series: 2"),
      "algorithms/src/main/java/d/README.md": article("series: 2"),
    });
    expect(() => findArticles(root)).toThrow(new Error("series numbers used more than once: 2, 3"));
  });
});
