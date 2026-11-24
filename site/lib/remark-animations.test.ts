import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Image, Paragraph, Root, RootContent } from "mdast";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

  it("fails, naming the article, when the trace is missing", () => {
    expect(() => run(paragraph(image("animations/missing.svg", "alt")))).toThrow(
      "data-structures/hashmap.md: no trace for animations/missing.svg",
    );
  });
});
