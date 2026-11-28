import path from "node:path";
import { describe, expect, it } from "vitest";
import { findArticles } from "./articles";
import { animationImages, buildPages, rewriteLinks } from "./links";

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

  it("keeps the anchor on a GitHub link, and drops an empty one", () => {
    const blob = `${github}/blob/main/data-structures/src/main/java/learn/ds/hashmap/ChainedHashMap.java`;
    expect(rewrite("[x](ChainedHashMap.java#L3)")).toBe(`[x](${blob}#L3)`);
    expect(rewrite("[x](ChainedHashMap.java#)")).toBe(`[x](${blob})`);
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

  it("leaves image links under animations/ alone, but not plain links", () => {
    expect(rewrite("![put](animations/put.svg)")).toBe("![put](animations/put.svg)");
    expect(rewrite("[put](animations/put.svg)")).toBe(
      `[put](${github}/blob/main/data-structures/src/main/java/learn/ds/hashmap/animations/put.svg)`,
    );
  });

  it("leaves fenced code alone", () => {
    const md = "```md\n[x](does-not-exist.java)\n```\n~~~\n[y](nope.java)\n~~~";
    expect(rewrite(md)).toBe(md);
  });

  it("treats an indented fence as a fence, and backticks mid-line as text", () => {
    const indented = "  ```\n[x](does-not-exist.java)\n  ```";
    expect(rewrite(indented)).toBe(indented);
    expect(rewrite("Use ``` here\n[s](ChainedHashMap.java)")).toContain(`${github}/blob/main/`);
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

describe("buildPages", () => {
  it("maps each article, the catalogue index and each catalogue file to its page", () => {
    expect([...pages]).toEqual([
      ["data-structures/src/main/java/learn/ds/hashmap/README.md", "data-structures/hashmap.md"],
      ["topics/README.md", "catalogue/index.md"],
      ["topics/data-structures.md", "catalogue/data-structures.md"],
    ]);
  });
});

describe("animationImages", () => {
  it("finds each animation image with its name and alt text", () => {
    expect(
      animationImages(
        "![Put](animations/put.svg) and ![Grow](../hashmap/animations/grow.svg#frame-2)\n" +
          "![Deep](a/b/animations/deep.svg) ![](animations/blank.svg)",
      ),
    ).toEqual([
      { name: "put", alt: "Put" },
      { name: "grow", alt: "Grow" },
      { name: "deep", alt: "Deep" },
      { name: "blank", alt: "" },
    ]);
  });

  it.each([
    ["a plain link", "[Put](animations/put.svg)"],
    ["a folder that only ends in animations", "![Put](myanimations/put.svg)"],
    ["another kind of file", "![Put](animations/put.svg.png)"],
    ["a file in a folder below animations", "![Put](animations/old/put.svg)"],
    ["an image in fenced code", "  ```\n![Put](animations/put.svg)\n  ```"],
  ])("ignores %s", (_name, markdown) => {
    expect(animationImages(markdown)).toEqual([]);
  });

  it("treats backticks mid-line as text, not a fence", () => {
    expect(animationImages("Use ``` here\n![Put](animations/put.svg)")).toEqual([{ name: "put", alt: "Put" }]);
  });
});
