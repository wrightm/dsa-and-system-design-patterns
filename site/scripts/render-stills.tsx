// Writes `<name>.svg` beside every `<name>.trace.json` in the topic modules: the still that
// GitHub shows in place of the animation, and the site shows without JavaScript.
import fs from "node:fs";
import path from "node:path";
import { findTraces, renderStill, stillPathOf } from "../lib/render/stills";
import { validateTrace } from "../lib/trace/validate";

export type StillsDeps = { repoRoot: string; log: (line: string) => void; error: (line: string) => void };

/** The repository around this site, and the console. */
export const DEFAULTS: StillsDeps = {
  repoRoot: path.resolve(import.meta.dirname, "..", ".."),
  log: console.log,
  error: console.error,
};

/** `pnpm stills`: renders every still, rewriting only those that changed. Returns the exit code. */
export function main({ repoRoot, log, error }: StillsDeps): number {
  const shown = (file: string) => path.relative(repoRoot, file).split(path.sep).join("/");
  try {
    for (const file of findTraces(repoRoot)) {
      const trace = validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), shown(file));
      const still = stillPathOf(file);
      const svg = renderStill(trace);
      const before = fs.existsSync(still) ? fs.readFileSync(still, "utf8") : null;
      if (before !== svg) fs.writeFileSync(still, svg, "utf8");
      const status = before === null ? "wrote" : before === svg ? "unchanged" : "updated";
      log(`${status.padEnd(9)} ${shown(still)} (${Buffer.byteLength(svg)} bytes)`);
    }
    return 0;
  } catch (failure) {
    error((failure as Error).message);
    return 1;
  }
}
