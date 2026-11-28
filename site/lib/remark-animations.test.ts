import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Image, Paragraph, Root, RootContent } from "mdast";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { remarkAnimations } from "./remark-animations";

let tracesDir: string;
const docsDir = "/site/content/docs";
const file = { path: `${docsDir}/data-structures/hashmap.md` };
const pagePathOf = (filePath: string) => path.relative(docsDir, filePath);

beforeAll(() => {
  tracesDir = fs.mkdtempSync(path.join(os.tmpdir(), "remark-animations-"));
  fs.mkdirSync(path.join(tracesDir, "data-structures", "hashmap"), { recursive: true });
  fs.writeFileSync(path.join(tracesDir, "data-structures", "hashmap", "put.json"), "{}");
});

afterAll(() => fs.rmSync(tracesDir, { recursive: true, force: true }));

const image = (url: string, alt: string): Image => ({ type: "image", url, alt });
const paragraph = (...children: Paragraph["children"]): Paragraph => ({ type: "paragraph", children });

function run(...children: RootContent[]): Root {
  const tree: Root = { type: "root", children };
  remarkAnimations({ pagePathOf, tracesDir })(tree, file);
  return tree;
}

describe("remarkAnimations", () => {
  it("turns an animations/put.svg image into an Animation element", () => {
    const tree = run(paragraph(image("animations/put.svg", 'Five puts: "alice" & <bob>')));
    expect(tree.children).toEqual([
      {
        type: "mdxJsxFlowElement",
        name: "Animation",
        attributes: [
          { type: "mdxJsxAttribute", name: "id", value: "data-structures/hashmap/put" },
          { type: "mdxJsxAttribute", name: "alt", value: 'Five puts: "alice" & <bob>' },
        ],
        children: [],
      },
    ]);
  });

  it("keeps the text around an animation in paragraphs of its own", () => {
    const tree = run(paragraph({ type: "text", value: "Before " }, image("animations/put.svg", "alt"), { type: "text", value: " after" }));
    expect(tree.children.map((c) => c.type)).toEqual(["paragraph", "mdxJsxFlowElement", "paragraph"]);
  });

  it("leaves an ordinary image untouched", () => {
    const before = paragraph(image("diagram.png", "a diagram"));
    const tree = run(structuredClone(before));
    expect(tree.children).toEqual([before]);
  });

  it.each(["", "   "])("fails, naming the article and the image, when the alt text is %j", (alt) => {
    expect(() => run(paragraph(image("animations/put.svg", alt)))).toThrow(
      "data-structures/hashmap.md: animations/put.svg needs alt text: it names the animation for screen readers",
    );
  });

  it("fails the same way when an animation image has no alt at all", () => {
    expect(() => run(paragraph({ type: "image", url: "animations/put.svg" }))).toThrow(
      "data-structures/hashmap.md: animations/put.svg needs alt text",
    );
  });

  it("fails, naming the article, when the trace is missing", () => {
    expect(() => run(paragraph(image("animations/missing.svg", "alt")))).toThrow(
      "data-structures/hashmap.md: no trace for animations/missing.svg",
    );
  });

  it("finds an animation at any depth, by path and with a fragment", () => {
    const tree = run({
      type: "list",
      children: [{ type: "listItem", children: [paragraph(image("../hashmap/animations/put.svg#start", "alt"))] }],
    });
    expect(tree).toMatchObject({
      children: [{ children: [{ children: [{ type: "mdxJsxFlowElement", name: "Animation" }] }] }],
    });
  });

  it("drops a run of only spaces and line breaks left beside an animation", () => {
    const tree = run(
      paragraph({ type: "text", value: "  " }, { type: "break" }, image("animations/put.svg", "alt"), { type: "text", value: "\n" }),
    );
    expect(tree.children.map((c) => c.type)).toEqual(["mdxJsxFlowElement"]);
  });

  it("keeps two animations in one paragraph as two players", () => {
    const tree = run(paragraph(image("animations/put.svg", "one"), image("animations/put.svg", "two")));
    expect(tree.children.map((c) => c.type)).toEqual(["mdxJsxFlowElement", "mdxJsxFlowElement"]);
  });

  it.each(["animations/put.png", "animations/sub/put.svg", "myanimations/put.svg", "animations/put.svg.png"])(
    "leaves %s alone, since it is not an animation",
    (url) => {
      const before = paragraph(image(url, "alt"));
      expect(run(structuredClone(before)).children).toEqual([before]);
    },
  );

  it("leaves a plain link to an animation's still alone", () => {
    const before = paragraph({ type: "link", url: "animations/put.svg", children: [{ type: "text", value: "still" }] });
    expect(run(structuredClone(before)).children).toEqual([before]);
  });

  it("names the player after the whole page path, even one with .md inside it", () => {
    fs.mkdirSync(path.join(tracesDir, "notes.md.d", "page"), { recursive: true });
    fs.writeFileSync(path.join(tracesDir, "notes.md.d", "page", "put.json"), "{}");
    const tree: Root = { type: "root", children: [paragraph(image("animations/put.svg", "alt"))] };
    remarkAnimations({ pagePathOf: () => "notes.md.d/page.md", tracesDir })(tree, file);
    expect(tree.children[0]).toMatchObject({ attributes: [{ value: "notes.md.d/page/put" }, { value: "alt" }] });
  });

  it("fails, naming the article and the parent, when an animation image is inside a link", () => {
    const linked = paragraph({ type: "link", url: "x", children: [image("animations/put.svg", "alt")] });
    expect(() => run(linked)).toThrow(
      new Error("data-structures/hashmap.md: animations/put.svg must stand in a paragraph, not inside a link"),
    );
  });

  it("reads traces from content/traces in the working folder by default", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "remark-animations-cwd-"));
    fs.mkdirSync(path.join(cwd, "content", "traces", "data-structures", "hashmap"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "content", "traces", "data-structures", "hashmap", "put.json"), "{}");
    const spy = vi.spyOn(process, "cwd").mockReturnValue(cwd);
    try {
      const tree: Root = { type: "root", children: [paragraph(image("animations/put.svg", "alt"))] };
      remarkAnimations({ pagePathOf })(tree, file);
      expect(tree.children[0]!.type).toBe("mdxJsxFlowElement");
    } finally {
      spy.mockRestore();
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
