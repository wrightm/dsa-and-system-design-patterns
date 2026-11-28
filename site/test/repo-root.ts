import fs from "node:fs";
import path from "node:path";

/**
 * The repository root: the nearest folder above this one that holds `settings.gradle.kts`. Found by
 * walking up rather than by a fixed `../..`, so the tests also run from Stryker's sandbox, a copy of
 * the site one level deeper inside `site/.stryker-tmp/`.
 */
function findRepoRoot(from: string): string {
  for (let dir = from; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "settings.gradle.kts"))) return dir;
    if (path.dirname(dir) === dir) throw new Error(`no settings.gradle.kts above ${from}`);
  }
}

export const REPO_ROOT = findRepoRoot(import.meta.dirname);
