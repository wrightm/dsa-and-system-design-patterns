import path from "node:path";
import { collect } from "../lib/content/collect";

export type CollectDeps = {
  repoRoot: string;
  siteDir: string;
  log: (line: string) => void;
  error: (line: string) => void;
};

const siteDir = path.resolve(import.meta.dirname, "..");

/** This site, the repository around it, and the console. */
export const DEFAULTS: CollectDeps = { siteDir, repoRoot: path.dirname(siteDir), log: console.log, error: console.error };

/** `pnpm collect`: copies the published articles, traces and stills into the site. Returns the exit code. */
export function main({ repoRoot, siteDir, log, error }: CollectDeps): number {
  try {
    const articles = collect({ repoRoot, siteDir });
    log(`collected ${articles.length} published article(s)`);
    for (const a of articles) log(`  ${String(a.series).padStart(3)}  ${a.module}/${a.slug}.md`);
    return 0;
  } catch (failure) {
    error((failure as Error).message);
    return 1;
  }
}
