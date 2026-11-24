import fs from "node:fs";
import path from "node:path";
import type { Nodes, Root } from "mdast";

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#|\/)/i;

function posix(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * The site URL (no base path, with a trailing slash) for a relative link to a `.md` page,
 * or null when the link is not one. Throws when the page does not exist.
 */
export function pageUrl(href: string, fromFile: string, docsDir: string): string | null {
  if (EXTERNAL.test(href)) return null;
  const hash = href.indexOf("#");
  const rawPath = hash === -1 ? href : href.slice(0, hash);
  const fragment = hash === -1 ? "" : href.slice(hash);
  if (!rawPath.endsWith(".md")) return null;

  const shown = posix(path.relative(docsDir, fromFile));
  const target = path.resolve(path.dirname(fromFile), rawPath);
  const relative = posix(path.relative(docsDir, target));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${shown}: link leaves the docs: ${href}`);
  }
  if (!fs.existsSync(target)) throw new Error(`${shown}: broken link: ${href}`);

  const page = relative.slice(0, -".md".length).replace(/(^|\/)index$/, "");
  return `/${page}${page === "" ? "" : "/"}${fragment}`;
}

/** Remark plugin: rewrites relative `.md` links between collected pages to site URLs. */
export function remarkPageLinks({ docsDir }: { docsDir: string }) {
  const root = path.resolve(docsDir);
  return (tree: Root, file: { path: string }) => {
    const visit = (node: Nodes) => {
      if (node.type === "link" || node.type === "definition") {
        const url = pageUrl(node.url, path.resolve(file.path), root);
        if (url !== null) node.url = url;
      }
      if ("children" in node) for (const child of node.children) visit(child);
    };
    visit(tree);
  };
}
