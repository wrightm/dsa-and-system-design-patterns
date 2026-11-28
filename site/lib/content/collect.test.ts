import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collect } from "./collect";

const fixtures = path.resolve(import.meta.dirname, "../../test/fixtures");
const repoRoot = path.join(fixtures, "repo");
const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), "collect-test-"));
fs.cpSync(path.resolve(import.meta.dirname, "../../content-src"), path.join(siteDir, "content-src"), {
  recursive: true,
});
const tempDirs = [siteDir];
afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});
const read = (...p: string[]) => fs.readFileSync(path.join(siteDir, ...p), "utf8");
const exists = (...p: string[]) => fs.existsSync(path.join(siteDir, ...p));

describe("collect", () => {
  beforeAll(() => {
    expect(collect({ repoRoot, siteDir })).toHaveLength(1);
  });

  it("writes the article with front matter, rewritten links and a footer", () => {
    const page = read("content/docs/data-structures/hashmap.md");
    expect(page).toMatch(/^---\ntitle: "Hash map: a fixture"\ndescription: A fixture article\.\n/);
    expect(page).toContain("series: 1\n");
    expect(page).toContain("[data structures](../catalogue/data-structures.md)");
    expect(page).toContain("![put](animations/put.svg)");
    expect(page).toContain("*Article 1 in [the series](../series.md), published 2026-11-18.");
  });

  it("writes domain indexes, series, home with the latest marker filled, about and catalogue", () => {
    expect(read("content/docs/data-structures/index.md")).toContain(
      "- **[Hash map: a fixture](hashmap.md)**: A fixture article.",
    );
    expect(read("content/docs/algorithms/index.md")).toContain("No articles published here yet.");
    expect(read("content/docs/series.md")).toContain(
      "| 1 | **[Hash map: a fixture](data-structures/hashmap.md)**<br>A fixture article. | [Data structures](data-structures/index.md) | 2026-11-18 |",
    );
    const home = read("content/docs/index.md");
    expect(home).not.toContain("<!-- LATEST -->");
    expect(home).toContain("- **[Hash map: a fixture](data-structures/hashmap.md)**<br>A fixture article.");
    expect(exists("content/docs/about.md")).toBe(true);
    expect(read("content/docs/catalogue/index.md")).toContain("**1 of 3 topics published.**");
    expect(read("content/docs/catalogue/index.md")).toContain("| [Data structures](data-structures.md) | 1 | 3 |");
    expect(read("content/docs/catalogue/data-structures.md")).toMatch(/^---\ntitle: Data structures\n---\n/);
  });

  it("orders the page tree: home, series, the domains in MODULES order, catalogue, about", () => {
    expect(JSON.parse(read("content/docs/meta.json"))).toEqual({
      pages: [
        "index",
        "series",
        "---Domains---",
        "data-structures",
        "algorithms",
        "concurrency",
        "oo-design",
        "design-patterns",
        "enterprise-integration-patterns",
        "distributed-systems",
        "microservices-patterns",
        "system-design",
        "library-studies",
        "challenges",
        "catalogue",
        "about",
      ],
    });
  });

  it("writes a home page with only a title and description in its front matter", () => {
    expect(read("content/docs/index.md")).toMatch(/^---\ntitle: Home\ndescription: [^\n]+\n---\n/);
  });

  it("writes the trace, the source it names and the still", () => {
    expect(JSON.parse(read("content/traces/data-structures/hashmap/put.json")).id).toBe("put");
    expect(read("content/sources/data-structures/hashmap/ChainedHashMap.java")).toContain("ChainedHashMap");
    expect(exists("public/generated/animations/data-structures/hashmap/put.svg")).toBe(true);
  });

  function tempRepo() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "collect-repo-"));
    tempDirs.push(repo);
    fs.cpSync(repoRoot, repo, { recursive: true });
    return { repo, dir: path.join(repo, "data-structures/src/main/java/learn/ds/hashmap") };
  }

  it("fails when an article image has no trace, naming the article", () => {
    const { repo, dir } = tempRepo();
    fs.appendFileSync(path.join(dir, "README.md"), "\n![typo](animations/typo.svg)\n");
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      "data-structures/src/main/java/learn/ds/hashmap/README.md: no trace for animations/typo.svg",
    );
  });

  it("fails when an animation image has no alt text, naming the article and the image", () => {
    const { repo, dir } = tempRepo();
    fs.appendFileSync(path.join(dir, "README.md"), "\n![ ](animations/put.svg)\n");
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      "data-structures/src/main/java/learn/ds/hashmap/README.md: animations/put.svg needs alt text: " +
        "it names the animation for screen readers",
    );
  });

  it("ignores an animations image inside a code fence", () => {
    const { repo, dir } = tempRepo();
    fs.appendFileSync(path.join(dir, "README.md"), "\n```md\n![x](animations/typo.svg)\n```\n");
    expect(() => collect({ repoRoot: repo, siteDir })).not.toThrow();
  });

  it("rejects a source.file that is not a plain file name", () => {
    const { repo, dir } = tempRepo();
    const file = path.join(dir, "animations/put.trace.json");
    const trace = JSON.parse(fs.readFileSync(file, "utf8"));
    trace.steps[0].source.file = "../README.md";
    fs.writeFileSync(file, JSON.stringify(trace));
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      /^data-structures\/.*put\.trace\.json: source\.file must be a plain file name/,
    );
  });

  it("skips a missing still silently and fails on a malformed trace", () => {
    const { repo, dir } = tempRepo();
    const animations = path.join(dir, "animations");
    fs.renameSync(path.join(animations, "put.svg"), path.join(repo, "moved.svg"));
    collect({ repoRoot: repo, siteDir });
    expect(exists("public/generated/animations/data-structures/hashmap/put.svg")).toBe(false);

    const bad = { ...JSON.parse(fs.readFileSync(path.join(animations, "put.trace.json"), "utf8")), version: 2 };
    fs.writeFileSync(path.join(animations, "put.trace.json"), JSON.stringify(bad));
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      /^data-structures\/src\/main\/java\/learn\/ds\/hashmap\/animations\/put\.trace\.json: /,
    );
  });

  it("fails on a trace that is not JSON, naming the file", () => {
    const { repo, dir } = tempRepo();
    fs.writeFileSync(path.join(dir, "animations/put.trace.json"), "{");
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      /^data-structures\/src\/main\/java\/learn\/ds\/hashmap\/animations\/put\.trace\.json: not valid JSON \(.+\)$/,
    );
  });

  it("fails when a trace names a source file that is not beside the article", () => {
    const { repo, dir } = tempRepo();
    const file = path.join(dir, "animations/put.trace.json");
    const trace = JSON.parse(fs.readFileSync(file, "utf8"));
    trace.steps[0].source.file = "Missing.java";
    fs.writeFileSync(file, JSON.stringify(trace));
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      "data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json: " +
        "source file not found beside the article: Missing.java",
    );
  });

  it("fails when the catalogue has no README", () => {
    const { repo } = tempRepo();
    fs.renameSync(path.join(repo, "topics/README.md"), path.join(repo, "topics-readme.md"));
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(new Error("topics/README.md is missing"));
  });

  it("says so on the home page when nothing is published", () => {
    const { repo, dir } = tempRepo();
    const readme = path.join(dir, "README.md");
    fs.writeFileSync(readme, fs.readFileSync(readme, "utf8").replace("status: published", "status: draft"));
    expect(collect({ repoRoot: repo, siteDir })).toEqual([]);
    expect(read("content/docs/index.md")).toContain("Nothing published yet.");
    expect(read("content/docs/series.md")).toMatch(/\|---\|---\|---\|---\|\n$/);
  });

  it("lists a domain's articles by title, ignoring case, and the series and home by number", () => {
    const { repo } = tempRepo();
    const base = "data-structures/src/main/java/learn/ds";
    const article = (title: string, series: number) =>
      `---\ntitle: ${title}\nsummary: About ${title}.\nstatus: published\ndate: 2026-11-2${series}\nseries: ${series}\n---\n# ${title}\n`;
    for (const [slug, title, series] of [
      ["trie", "trie", 2],
      ["array", "Zipped array", 3],
      ["bag", "Bag", 4],
      ["deque", "deque", 5],
      ["heap", "Heap", 6],
    ] as const) {
      fs.mkdirSync(path.join(repo, base, slug));
      fs.writeFileSync(path.join(repo, base, slug, "README.md"), article(title, series));
    }
    expect(collect({ repoRoot: repo, siteDir }).map((a) => a.series)).toEqual([1, 2, 3, 4, 5, 6]);
    const index = read("content/docs/data-structures/index.md");
    const order = ["Bag", "deque", "Hash map: a fixture", "Heap", "trie", "Zipped array"].map((t) =>
      index.indexOf(`[${t}]`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order).not.toContain(-1);
    const series = read("content/docs/series.md");
    expect(series.indexOf("| 1 |")).toBeLessThan(series.indexOf("| 2 |"));
    expect(series.indexOf("| 5 |")).toBeLessThan(series.indexOf("| 6 |"));
    const home = read("content/docs/index.md");
    expect(home.indexOf("[Heap]")).toBeLessThan(home.indexOf("[deque]"));
    expect(home.indexOf("[Zipped array]")).toBeLessThan(home.indexOf("[trie]"));
    expect(home).not.toContain("Hash map: a fixture");
    expect(exists("content/traces/data-structures/trie")).toBe(false);
  });
});
