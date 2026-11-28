// Renders a recorded trace as a square MP4 for LinkedIn, with the same renderer the site uses:
//   pnpm video <module>/<slug>/<name> <output.mp4>
// Reads the trace from content/traces (run `pnpm collect` first). Remotion downloads a headless
// browser the first time it runs.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readJson } from "../lib/read-json";
import { validateTrace } from "../lib/trace/validate";
import { FPS, MAX_FRAMES } from "../remotion/interpolate";
import type { TraceVideoProps } from "../remotion/TraceVideo";

const ID = /^([a-z0-9-]+\/[a-z0-9-]+)\/[a-z0-9-]+$/;

export type VideoDeps = {
  /** The site folder, which holds `content/traces` and `remotion/index.ts`. */
  site: string;
  bundle: typeof bundle;
  selectComposition: typeof selectComposition;
  renderMedia: typeof renderMedia;
  now: () => number;
  log: (line: string) => void;
  error: (line: string) => void;
};

/** This site, Remotion, the clock and the console. */
export const DEFAULTS: VideoDeps = {
  site: path.resolve(import.meta.dirname, ".."),
  bundle,
  selectComposition,
  renderMedia,
  now: Date.now,
  log: console.log,
  error: console.error,
};

async function render([id, output]: string[], deps: VideoDeps) {
  // No id at all reads as "undefined", which is not an id either.
  const match = ID.exec(String(id));
  if (!match || !output) throw new Error("usage: pnpm video <module>/<slug>/<name> <output.mp4>");
  const shown = `content/traces/${id}.json`;
  const file = path.join(deps.site, shown);
  if (!fs.existsSync(file)) throw new Error(`${shown}: not found (run pnpm collect first)`);
  const trace = validateTrace(readJson(file, shown), shown);
  const inputProps: TraceVideoProps = { trace, page: match[1]! };

  const started = deps.now();
  const serveUrl = await deps.bundle({ entryPoint: path.join(deps.site, "remotion/index.ts") });
  const composition = await deps.selectComposition({ serveUrl, id: "TraceVideo", inputProps });
  if (composition.durationInFrames > MAX_FRAMES) {
    throw new Error(`${shown}: ${trace.steps.length} steps need ${(composition.durationInFrames / FPS).toFixed(1)} s, over the limit`);
  }
  const outputLocation = path.resolve(output);
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
  await deps.renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps });

  const seconds = ((deps.now() - started) / 1000).toFixed(1);
  const bytes = fs.statSync(outputLocation).size;
  deps.log(
    `wrote ${output}: ${composition.width}x${composition.height}, ${(composition.durationInFrames / FPS).toFixed(1)} s, ${bytes} bytes, in ${seconds} s`,
  );
}

/** `pnpm video <id> <output.mp4>`. Returns the exit code. */
export async function main(argv: string[], deps: VideoDeps): Promise<number> {
  try {
    await render(argv, deps);
    return 0;
  } catch (failure) {
    deps.error((failure as Error).message);
    return 1;
  }
}
