import fs from "node:fs";
import path from "node:path";

export type Progress = { file: string; title: string; done: number; total: number };

const CHECKBOX = /^- \[( |x)\] /gm;

/** Catalogue files under topics/ (README.md excluded), sorted by file name. */
export function catalogueFiles(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "topics");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort();
}

export function catalogueTitle(text: string): string {
  return (text.split("\n", 1)[0] ?? "").replace(/^# /, "").trim();
}

export function catalogueProgress(repoRoot: string): Progress[] {
  return catalogueFiles(repoRoot).map((file) => {
    const text = fs.readFileSync(path.join(repoRoot, "topics", file), "utf8");
    const boxes = [...text.matchAll(CHECKBOX)].map((m) => m[1]);
    return {
      file,
      title: catalogueTitle(text),
      done: boxes.filter((b) => b === "x").length,
      total: boxes.length,
    };
  });
}
