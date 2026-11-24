// Writes `<name>.svg` beside every `<name>.trace.json` in the topic modules: the still that
// GitHub shows in place of the animation, and the site shows without JavaScript.
import fs from "node:fs";
import path from "node:path";
import { findTraces, renderStill, stillPathOf } from "../lib/render/stills";
import { validateTrace } from "../lib/trace/validate";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

try {
  for (const file of findTraces(repoRoot)) {
    const shown = path.relative(repoRoot, file).split(path.sep).join("/");
    const trace = validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), shown);
    const still = stillPathOf(file);
    const svg = renderStill(trace);
    const before = fs.existsSync(still) ? fs.readFileSync(still, "utf8") : null;
    if (before !== svg) fs.writeFileSync(still, svg, "utf8");
    const status = before === null ? "wrote" : before === svg ? "unchanged" : "updated";
    console.log(`${status.padEnd(9)} ${path.relative(repoRoot, still).split(path.sep).join("/")} (${Buffer.byteLength(svg)} bytes)`);
  }
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
