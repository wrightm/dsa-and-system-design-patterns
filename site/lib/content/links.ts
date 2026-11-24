import fs from "node:fs";
import path from "node:path";
import { type Article, BRANCH, GITHUB, pagePath } from "./articles";
import { catalogueFiles } from "./catalogue";

// [text](target) and ![alt](target); target has no spaces or closing parenthesis.
const LINK = /(!?\[[^\]]*\])\(([^)\s]+)\)/g;
const FENCE = /^(```|~~~)/;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#|\/\/)/i;
const ANIMATION = /(^|\/)animations\//;

/** Repo-relative source path to the docs-relative page it becomes. */
export function buildPages(articles: Article[], repoRoot: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const article of articles) pages.set(article.sourcePath, pagePath(article));
  pages.set("topics/README.md", "catalogue/index.md");
  for (const file of catalogueFiles(repoRoot)) pages.set(`topics/${file}`, `catalogue/${file}`);
  return pages;
}

function posix(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * Rewrites links in a Markdown file that is moving into the docs tree.
 * `sourceFile` is absolute; `pagePath` is the docs-relative path of the page it becomes.
 */
export function rewriteLinks(
  markdown: string,
  sourceFile: string,
  pagePath: string,
  pages: Map<string, string>,
  repoRoot: string,
): string {
  const root = path.resolve(repoRoot);
  const shown = posix(path.relative(root, sourceFile));

  const rewriteLink = (whole: string, label: string, target: string): string => {
    if (EXTERNAL.test(target)) return whole;
    const hash = target.indexOf("#");
    const rawPath = hash === -1 ? target : target.slice(0, hash);
    const suffix = hash === -1 || hash === target.length - 1 ? "" : target.slice(hash);
    if (label.startsWith("!") && ANIMATION.test(rawPath)) return whole;

    const resolved = path.resolve(path.dirname(sourceFile), rawPath);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`${shown}: link leaves the repository: ${target}`);
    }
    if (!fs.existsSync(resolved)) throw new Error(`${shown}: broken link: ${target}`);

    let repoPath = posix(relative);
    const isDir = fs.statSync(resolved).isDirectory();
    if (isDir && pages.has(posix(path.join(relative, "README.md")))) repoPath = `${repoPath}/README.md`;
    const page = pages.get(repoPath);
    if (page !== undefined) {
      const from = path.posix.dirname(pagePath);
      return `${label}(${path.posix.relative(from, page)}${suffix})`;
    }
    return `${label}(${GITHUB}/${isDir ? "tree" : "blob"}/${BRANCH}/${repoPath}${suffix})`;
  };

  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE.test(line.trimStart())) inFence = !inFence;
      return inFence ? line : line.replace(LINK, rewriteLink);
    })
    .join("\n");
}
