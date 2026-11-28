import { describe, expect, it } from "vitest";
import { isArticle, ogImagePath } from "./og";
import { source } from "./source";

describe("source", () => {
  it("serves every collected page at its path from the site root", () => {
    expect(source.getPages().map((page) => page.url).sort()).toEqual([
      "/",
      "/about",
      "/data-structures",
      "/data-structures/hashmap",
      "/data-structures/no-summary",
    ]);
    expect(source.getPage(["data-structures", "hashmap"])!.data.title).toBe("Hash map");
    expect(source.getPage(["nope"])).toBeUndefined();
  });
});

describe("link-preview images", () => {
  const page = (...slugs: string[]) => source.getPage(slugs)!;

  it("go to articles, the pages with a series number", () => {
    expect(source.getPages().filter(isArticle).map((p) => p.url).sort()).toEqual([
      "/data-structures/hashmap",
      "/data-structures/no-summary",
    ]);
  });

  it("sit under /og at the page's path", () => {
    expect(ogImagePath(page("data-structures", "hashmap"))).toBe("/og/data-structures/hashmap/image.png");
    expect(ogImagePath(page())).toBe("/og/image.png");
  });
});
