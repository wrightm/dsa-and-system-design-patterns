import path from "node:path";
import { collect } from "../lib/content/collect";

const siteDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(siteDir, "..");

try {
  const articles = collect({ repoRoot, siteDir });
  console.log(`collected ${articles.length} published article(s)`);
  for (const a of articles) console.log(`  ${String(a.series).padStart(3)}  ${a.module}/${a.slug}.md`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
