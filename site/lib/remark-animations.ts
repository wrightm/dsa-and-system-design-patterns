import fs from "node:fs";
import path from "node:path";
import type { Nodes, Paragraph, Parent, Root, RootContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { missingAlt } from "./content/links";

// Same rule as `animationImages` in lib/content/links.ts, which collect checks first.
const ANIMATION = /^(?:.*\/)?animations\/([^/#]+)\.svg(?:#.*)?$/;

export type RemarkAnimationsOptions = {
  /** The page path of a compiled file, relative to the docs folder: `data-structures/hashmap.md`. */
  pagePathOf: (filePath: string) => string;
  /** Where collect wrote the traces, as `<module>/<slug>/<name>.json`. */
  tracesDir?: string;
};

/** The animation an image stands for, or null for any other node. */
function animationOf(node: Nodes): { name: string; alt: string } | null {
  if (node.type !== "image") return null;
  const name = ANIMATION.exec(node.url)?.[1];
  return name === undefined ? null : { name, alt: node.alt ?? "" };
}

function isBlank(node: Paragraph["children"][number]): boolean {
  return (node.type === "text" && node.value.trim() === "") || node.type === "break";
}

/**
 * Remark plugin: an image under `animations/` becomes `<Animation id="<module>/<slug>/<name>" alt>`,
 * rendered through the MDX components map. A paragraph holding one is split, so the player is
 * never inside a `<p>`. Throws, naming the article, when the trace or the alt text is missing.
 */
export function remarkAnimations({ pagePathOf, tracesDir = path.resolve("content/traces") }: RemarkAnimationsOptions) {
  return (tree: Root, file: { path: string }) => {
    const article = pagePathOf(path.resolve(file.path)).split(path.sep).join("/");
    const page = article.replace(/\.md$/, "");

    const element = (name: string, alt: string): MdxJsxFlowElement => {
      if (alt.trim() === "") throw new Error(missingAlt(article, name));
      const id = `${page}/${name}`;
      if (!fs.existsSync(path.join(tracesDir, `${id}.json`))) {
        throw new Error(`${article}: no trace for animations/${name}.svg`);
      }
      return {
        type: "mdxJsxFlowElement",
        name: "Animation",
        attributes: [
          { type: "mdxJsxAttribute", name: "id", value: id },
          { type: "mdxJsxAttribute", name: "alt", value: alt },
        ],
        children: [],
      };
    };

    const split = (paragraph: Paragraph): RootContent[] => {
      const out: RootContent[] = [];
      let run: Paragraph["children"] = [];
      const flush = () => {
        if (run.some((c) => !isBlank(c))) out.push({ ...paragraph, children: run });
        run = [];
      };
      for (const child of paragraph.children) {
        const animation = animationOf(child);
        if (animation === null) {
          run.push(child);
          continue;
        }
        flush();
        out.push(element(animation.name, animation.alt));
      }
      flush();
      return out;
    };

    const visit = (parent: Parent) => {
      const children: RootContent[] = [];
      for (const child of parent.children as RootContent[]) {
        if (child.type === "paragraph" && child.children.some((c) => animationOf(c) !== null)) {
          children.push(...split(child));
          continue;
        }
        const animation = animationOf(child);
        if (animation !== null) {
          throw new Error(
            `${article}: animations/${animation.name}.svg must stand in a paragraph, not inside a ${parent.type}`,
          );
        }
        if ("children" in child) visit(child);
        children.push(child);
      }
      parent.children = children as Parent["children"];
    };
    visit(tree);
  };
}
