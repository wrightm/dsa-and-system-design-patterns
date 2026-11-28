import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Root } from "mdast";
import { afterAll, describe, expect, it } from "vitest";
import { pageUrl, remarkPageLinks } from "./page-links";

const docs = fs.mkdtempSync(path.join(os.tmpdir(), "page-links-"));
afterAll(() => fs.rmSync(docs, { recursive: true, force: true }));
for (const file of ["index.md", "series.md", "data-structures/index.md", "data-structures/hashmap.md", "catalogue/index.md", "indexes.md"]) {
  fs.mkdirSync(path.dirname(path.join(docs, file)), { recursive: true });
  fs.writeFileSync(path.join(docs, file), "");
}
const from = (file: string) => path.join(docs, file);

describe("pageUrl", () => {
  it("turns a relative .md link into the page's trailing-slash URL", () => {
    expect(pageUrl("data-structures/hashmap.md", from("series.md"), docs)).toBe("/data-structures/hashmap/");
    expect(pageUrl("hashmap.md", from("data-structures/index.md"), docs)).toBe("/data-structures/hashmap/");
    expect(pageUrl("../series.md", from("data-structures/hashmap.md"), docs)).toBe("/series/");
  });

  it("maps index pages to their folder and the home page to the root", () => {
    expect(pageUrl("data-structures/index.md", from("series.md"), docs)).toBe("/data-structures/");
    expect(pageUrl("../catalogue/index.md", from("data-structures/hashmap.md"), docs)).toBe("/catalogue/");
    expect(pageUrl("../index.md", from("data-structures/hashmap.md"), docs)).toBe("/");
    expect(pageUrl("indexes.md", from("series.md"), docs)).toBe("/indexes/");
  });

  it("keeps the fragment", () => {
    expect(pageUrl("hashmap.md#resizing", from("data-structures/index.md"), docs)).toBe(
      "/data-structures/hashmap/#resizing",
    );
  });

  it("leaves external, absolute, fragment-only and non-Markdown links alone", () => {
    for (const href of ["https://github.com/a/b.md", "mailto:x@y.z", "#top", "/already/", "animations/put.svg"]) {
      expect(pageUrl(href, from("data-structures/hashmap.md"), docs)).toBeNull();
    }
  });

  it("fails on a link to a page that does not exist or lies outside the docs", () => {
    expect(() => pageUrl("missing.md", from("series.md"), docs)).toThrow("series.md: broken link: missing.md");
    expect(() => pageUrl("../../outside.md", from("data-structures/hashmap.md"), docs)).toThrow(
      "data-structures/hashmap.md: link leaves the docs: ../../outside.md",
    );
  });
});

describe("remarkPageLinks", () => {
  it("rewrites links and link definitions in the tree", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "link", url: "data-structures/hashmap.md", children: [{ type: "text", value: "Hash map" }] },
            { type: "link", url: "https://example.com/", children: [] },
          ],
        },
        { type: "definition", identifier: "s", label: "s", url: "series.md" },
      ],
    };
    remarkPageLinks({ docsDir: docs })(tree, { path: from("index.md") });
    const paragraph = tree.children[0] as { children: { url: string }[] };
    expect(paragraph.children.map((c) => c.url)).toEqual(["/data-structures/hashmap/", "https://example.com/"]);
    expect((tree.children[1] as { url: string }).url).toBe("/series/");
  });
});
