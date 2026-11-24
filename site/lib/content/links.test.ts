import path from "node:path";
import { describe, expect, it } from "vitest";
import { findArticles } from "./articles";
import { buildPages, rewriteLinks } from "./links";

const root = path.resolve(import.meta.dirname, "../../test/fixtures/repo");
const articles = findArticles(root);
const pages = buildPages(articles, root);
const article = articles[0]!;
const source = path.join(root, article.sourcePath);
const pagePath = "data-structures/hashmap.md";
const github = "https://github.com/wrightm/dsa-and-system-design-patterns";
const rewrite = (md: string) => rewriteLinks(md, source, pagePath, pages, root);

describe("rewriteLinks", () => {
  it("sends a sibling source file to GitHub", () => {
    expect(rewrite("[x](ChainedHashMap.java)")).toBe(
      `[x](${github}/blob/main/data-structures/src/main/java/learn/ds/hashmap/ChainedHashMap.java)`,
    );
  });

  it("keeps the anchor on a GitHub link", () => {
    expect(rewrite("[x](ChainedHashMap.java#L3)")).toContain("ChainedHashMap.java#L3)");
  });

  it("sends a test file up the tree to GitHub", () => {
    expect(rewrite("[t](../../../../../test/java/learn/ds/hashmap/ChainedHashMapTest.java)")).toBe(
      `[t](${github}/blob/main/data-structures/src/test/java/learn/ds/hashmap/ChainedHashMapTest.java)`,
    );
  });

  it("turns a catalogue file into a site-relative link", () => {
    expect(rewrite("[c](../../../../../../../topics/data-structures.md)")).toBe(
      "[c](../catalogue/data-structures.md)",
    );
  });

  it("turns another published article into a site-relative link", () => {
    const other = new Map(pages).set(
      "data-structures/src/main/java/learn/ds/draft/README.md",
      "data-structures/draft.md",
    );
    expect(
      rewriteLinks("[a](../draft/README.md) [d](../draft)", source, pagePath, other, root),
    ).toBe("[a](draft.md) [d](draft.md)");
  });

  it("sends an unpublished article and a directory to GitHub", () => {
    expect(rewrite("[a](../draft/README.md)")).toContain(
      `${github}/blob/main/data-structures/src/main/java/learn/ds/draft/README.md`,
    );
    expect(rewrite("[d](../draft)")).toContain(
      `${github}/tree/main/data-structures/src/main/java/learn/ds/draft)`,
    );
  });

  it("leaves external and anchor links alone", () => {
    expect(rewrite("[o](https://docs.oracle.com/) [a](#below) [m](mailto:x@y.z)")).toBe(
      "[o](https://docs.oracle.com/) [a](#below) [m](mailto:x@y.z)",
    );
  });

  it("leaves image links under animations/ alone", () => {
    expect(rewrite("![put](animations/put.svg)")).toBe("![put](animations/put.svg)");
  });

  it("leaves fenced code alone", () => {
    const md = "```md\n[x](does-not-exist.java)\n```\n~~~\n[y](nope.java)\n~~~";
    expect(rewrite(md)).toBe(md);
  });

  it("rewrites links after a fence closes", () => {
    expect(rewrite("```\n[x](a)\n```\n[s](ChainedHashMap.java)")).toContain(`${github}/blob/main/`);
  });

  it("throws, naming the file, on a missing target", () => {
    expect(() => rewrite("[x](Missing.java)")).toThrow(
      /data-structures\/src\/main\/java\/learn\/ds\/hashmap\/README\.md: broken link: Missing\.java/,
    );
  });

  it("throws on a link that leaves the repository", () => {
    expect(() => rewrite("[x](../../../../../../../../../etc/hosts)")).toThrow(/leaves the repository/);
  });
});
