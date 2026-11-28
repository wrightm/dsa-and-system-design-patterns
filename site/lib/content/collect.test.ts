import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { collect, frontMatter } from "./collect";

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
afterEach(() => {
  vi.restoreAllMocks();
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

  // The generated pages, word for word, for the fixture's one article.
  const GITHUB = "https://github.com/wrightm/dsa-and-system-design-patterns";

  it("ends the article with a footer naming its number, date, folder and where to report a mistake", () => {
    const page = read("content/docs/data-structures/hashmap.md");
    expect(page.slice(page.indexOf("## Below"))).toBe(
      "## Below\n\n---\n\n" +
        "*Article 1 in [the series](../series.md), published 2026-11-18. " +
        "The code and tests live beside this article in " +
        `[\`data-structures/src/main/java/learn/ds/hashmap\`](${GITHUB}/tree/main/data-structures/src/main/java/learn/ds/hashmap). ` +
        `Found a mistake or have a question? [Open an issue](${GITHUB}/issues).*\n`,
    );
    expect(page.startsWith(
      '---\ntitle: "Hash map: a fixture"\ndescription: A fixture article.\nsummary: A fixture article.\n' +
        "date: 2026-11-18\nseries: 1\ntags:\n  - data-structures\n  - hashing\n---\n\n\n# Hash map: a fixture\n",
    )).toBe(true);
  });

  it("writes a domain index listing its articles and linking its catalogue", () => {
    expect(read("content/docs/data-structures/index.md")).toBe(
      "---\ntitle: Data structures\n" +
        "description: Structures built from scratch, each compared with the JDK or library version.\n---\n\n\n" +
        "# Data structures\n\n" +
        "Structures built from scratch, each compared with the JDK or library version.\n\n" +
        "## Articles\n\n" +
        "- **[Hash map: a fixture](hashmap.md)**: A fixture article.\n\n" +
        "See [what is planned for this domain](../catalogue/data-structures.md).\n",
    );
  });

  it("says when a domain has no articles yet, and links a catalogue only when the domain has one", () => {
    expect(read("content/docs/algorithms/index.md")).toBe(
      "---\ntitle: Algorithms\n" +
        "description: Algorithms and the problem-solving patterns coding challenges keep returning to.\n---\n\n\n" +
        "# Algorithms\n\n" +
        "Algorithms and the problem-solving patterns coding challenges keep returning to.\n\n" +
        "No articles published here yet.\n\n" +
        "See [what is planned for this domain](../catalogue/algorithms.md).\n",
    );
    expect(read("content/docs/challenges/index.md")).toBe(
      "---\ntitle: Challenges\ndescription: Coding challenge solutions, linked to the topics they use.\n---\n\n\n" +
        "# Challenges\n\nCoding challenge solutions, linked to the topics they use.\n\n" +
        "No articles published here yet.\n",
    );
  });

  it("writes the series page as a table in publishing order", () => {
    expect(read("content/docs/series.md")).toBe(
      "---\ntitle: The series\ndescription: Every article in the order it was published.\n---\n\n\n" +
        "# The series\n\n" +
        "Every article in the order it was published. Topics are written as they come up, " +
        "so this is a reading order by date, not a curriculum. Each article says what it assumes.\n\n" +
        "| # | Article | Domain | Published |\n" +
        "|---|---|---|---|\n" +
        "| 1 | **[Hash map: a fixture](data-structures/hashmap.md)**<br>A fixture article. " +
        "| [Data structures](data-structures/index.md) | 2026-11-18 |\n",
    );
  });

  it("writes the catalogue index with each domain's progress", () => {
    expect(read("content/docs/catalogue/index.md")).toBe(
      "---\ntitle: Catalogue\ndescription: Every planned topic and how far along it is.\n---\n\n\n" +
        "# Topic catalogue\n\n" +
        "**1 of 3 topics published.** There is no required order: " +
        "topics are written as they come up in coding challenges and day-to-day work.\n\n" +
        "| Domain | Published | Planned |\n" +
        "|---|---|---|\n" +
        "| [Data structures](data-structures.md) | 1 | 3 |\n\n" +
        "A ticked entry links to its article. **needs** lists what helps to know first, " +
        "and **wild** names real implementations worth reading alongside the topic.\n\n" +
        `The catalogue is edited in the [repository](${GITHUB}/tree/main/topics). ` +
        "If something is missing, open an issue or a pull request.\n",
    );
  });

  it("writes the page tree order as JSON ending in a newline, and copies about unchanged", () => {
    expect(read("content/docs/meta.json")).toMatch(/^\{\n  "pages": \[\n    "index",\n[\s\S]*\n  \]\n\}\n$/);
    expect(read("content/docs/about.md")).toBe(read("content-src/about.md"));
  });

  it("writes a home page with only a title and description in its front matter", () => {
    expect(read("content/docs/index.md")).toMatch(/^---\ntitle: Home\ndescription: [^\n]+\n---\n/);
  });

  it("writes the trace, the source it names and the still", () => {
    expect(JSON.parse(read("content/traces/data-structures/hashmap/put.json")).id).toBe("put");
    expect(read("content/sources/data-structures/hashmap/ChainedHashMap.java")).toContain("ChainedHashMap");
    expect(exists("public/generated/animations/data-structures/hashmap/put.svg")).toBe(true);
  });

  it("copies the trace and the source byte for byte", () => {
    const dir = path.join(repoRoot, "data-structures/src/main/java/learn/ds/hashmap");
    expect(read("content/traces/data-structures/hashmap/put.json")).toBe(
      fs.readFileSync(path.join(dir, "animations/put.trace.json"), "utf8"),
    );
    expect(read("content/sources/data-structures/hashmap/ChainedHashMap.java")).toBe(
      fs.readFileSync(path.join(dir, "ChainedHashMap.java"), "utf8"),
    );
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
    expect(home).toContain(
      "- **[Heap](data-structures/heap.md)**<br>About Heap.\n- **[deque](data-structures/deque.md)**<br>About deque.\n",
    );
    expect(exists("content/traces/data-structures/trie")).toBe(false);
  });

  it("replaces what it wrote last time and leaves the rest of public/ alone", () => {
    fs.mkdirSync(path.join(siteDir, "content/docs"), { recursive: true });
    fs.writeFileSync(path.join(siteDir, "content/docs/stale.md"), "old");
    fs.mkdirSync(path.join(siteDir, "public/generated"), { recursive: true });
    fs.writeFileSync(path.join(siteDir, "public/generated/stale.svg"), "old");
    fs.writeFileSync(path.join(siteDir, "public/keep.txt"), "mine");
    collect({ repoRoot, siteDir });
    expect(exists("content/docs/stale.md")).toBe(false);
    expect(exists("public/generated/stale.svg")).toBe(false);
    expect(read("public/keep.txt")).toBe("mine");
  });

  it("ends the article body with one newline before the footer, however many it had", () => {
    const { repo, dir } = tempRepo();
    fs.appendFileSync(path.join(dir, "README.md"), "\n\n\n");
    collect({ repoRoot: repo, siteDir });
    expect(read("content/docs/data-structures/hashmap.md")).toContain("## Below\n\n---\n\n*Article 1");
  });

  it("checks an article's traces in name order, whatever order the folder is listed in", () => {
    const { repo, dir } = tempRepo();
    for (const name of ["a", "b"]) fs.writeFileSync(path.join(dir, `animations/${name}.trace.json`), "{");
    const list = fs.readdirSync;
    vi.spyOn(fs, "readdirSync").mockImplementation(((folder: fs.PathLike, options: never) =>
      (list(folder, options) as unknown[]).reverse()) as typeof fs.readdirSync);
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(/animations\/a\.trace\.json: not valid JSON/);
  });

  it("keeps titles that differ only in case in the order they were found", () => {
    const { repo } = tempRepo();
    const base = "data-structures/src/main/java/learn/ds";
    for (const [slug, title, series] of [
      ["a", "Heap", 2],
      ["b", "heap", 3],
    ] as const) {
      fs.mkdirSync(path.join(repo, base, slug));
      fs.writeFileSync(
        path.join(repo, base, slug, "README.md"),
        `---\ntitle: ${title}\nsummary: S.\nstatus: published\ndate: 2026-11-2${series}\nseries: ${series}\n---\n# ${title}\n`,
      );
    }
    collect({ repoRoot: repo, siteDir });
    const index = read("content/docs/data-structures/index.md");
    expect(index.indexOf("[Heap](a.md)")).toBeLessThan(index.indexOf("[heap](b.md)"));
  });
});

describe("frontMatter", () => {
  it("leaves out empty fields and keeps every other value", () => {
    expect(
      frontMatter({ a: null, b: undefined, c: "", d: [], e: 0, f: false, g: "x", h: ["y"] }),
    ).toBe("---\ne: 0\nf: false\ng: x\nh:\n  - y\n---\n\n");
  });

  it("never folds a long line", () => {
    const long = "word ".repeat(40).trim();
    expect(frontMatter({ description: long })).toBe(`---\ndescription: ${long}\n---\n\n`);
  });
});
