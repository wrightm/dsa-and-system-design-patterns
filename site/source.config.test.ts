import path from "node:path";
import { nodeTypes } from "@mdx-js/mdx";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import rehypeRaw from "rehype-raw";
import { describe, expect, it } from "vitest";
import { remarkPageLinks } from "./lib/page-links";
import { remarkAnimations } from "./lib/remark-animations";
import config, { docs } from "./source.config";

type Plugins = (preset: unknown[]) => unknown[];
// The config sets its options directly, not as a function that loads them.
const options = config.mdxOptions as { remarkPlugins: unknown; rehypePlugins: unknown };

describe("the docs collection", () => {
  const schema = docs.docs.schema as { safeParse: (value: unknown) => { success: boolean } };

  it("reads content/docs", () => {
    expect(docs.dir).toBe("content/docs");
    expect(docs.docs.dir).toBe("content/docs");
  });

  it("accepts an article's front matter", () => {
    const article = { title: "Hash map", summary: "s", date: "2026-11-01", series: 1, tags: ["a", "b"] };
    expect(schema.safeParse(article).success).toBe(true);
    expect(schema.safeParse({ title: "About" }).success).toBe(true);
  });

  it.each([
    ["a series that is not a number", { series: "1" }],
    ["a summary that is not text", { summary: 1 }],
    ["a date that is not text", { date: 20261101 }],
    ["tags that are not a list of text", { tags: "a" }],
    ["a tag that is not text", { tags: [1] }],
  ])("rejects %s", (_name, field) => {
    expect(schema.safeParse({ title: "T", ...field }).success).toBe(false);
  });
});

describe("the Markdown pipeline", () => {
  const remark = (options.remarkPlugins as Plugins)(["preset"]);
  const rehype = (options.rehypePlugins as Plugins)(["preset"]);
  const docsDir = path.resolve("content/docs");

  it("rewrites links, then animations, then Mermaid, ahead of Fumadocs' own plugins", () => {
    expect(remark).toEqual([
      [remarkPageLinks, { docsDir }],
      [remarkAnimations, { pagePathOf: expect.any(Function), tracesDir: path.resolve("content/traces") }],
      remarkMdxMermaid,
      "preset",
    ]);
  });

  it("names an animation's page by its path under content/docs", () => {
    const [, { pagePathOf }] = remark[1] as [unknown, { pagePathOf: (file: string) => string }];
    expect(pagePathOf(path.join(docsDir, "data-structures/hashmap.md"))).toBe("data-structures/hashmap.md");
  });

  it("parses raw HTML, passing MDX nodes through, ahead of Fumadocs' own plugins", () => {
    expect(rehype).toEqual([[rehypeRaw, { passThrough: nodeTypes }], "preset"]);
  });
});
