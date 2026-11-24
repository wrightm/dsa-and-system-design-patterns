import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { collect } from "./collect";

const fixtures = path.resolve(import.meta.dirname, "../../test/fixtures");
const repoRoot = path.join(fixtures, "repo");
const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), "collect-test-"));
fs.cpSync(path.resolve(import.meta.dirname, "../../content-src"), path.join(siteDir, "content-src"), {
  recursive: true,
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

  it("writes the trace, the source it names and the still", () => {
    expect(JSON.parse(read("content/traces/data-structures/hashmap/put.json")).id).toBe("put");
    expect(read("content/sources/data-structures/hashmap/ChainedHashMap.java")).toContain("ChainedHashMap");
    expect(exists("public/generated/animations/data-structures/hashmap/put.svg")).toBe(true);
  });

  it("skips a missing still silently and fails on a malformed trace", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "collect-repo-"));
    fs.cpSync(repoRoot, repo, { recursive: true });
    const animations = path.join(repo, "data-structures/src/main/java/learn/ds/hashmap/animations");
    fs.renameSync(path.join(animations, "put.svg"), path.join(repo, "moved.svg"));
    collect({ repoRoot: repo, siteDir });
    expect(exists("public/generated/animations/data-structures/hashmap/put.svg")).toBe(false);

    const bad = { ...JSON.parse(fs.readFileSync(path.join(animations, "put.trace.json"), "utf8")), version: 2 };
    fs.writeFileSync(path.join(animations, "put.trace.json"), JSON.stringify(bad));
    expect(() => collect({ repoRoot: repo, siteDir })).toThrow(
      /^data-structures\/src\/main\/java\/learn\/ds\/hashmap\/animations\/put\.trace\.json: /,
    );
  });
});
