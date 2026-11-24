// Renders a recorded trace as a square MP4 for LinkedIn, with the same renderer the site uses:
//   pnpm video <module>/<slug>/<name> <output.mp4>
// Reads the trace from content/traces (run `pnpm collect` first). Remotion downloads a headless
// browser the first time it runs.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { validateTrace } from "../lib/trace/validate";
import { FPS, MAX_FRAMES } from "../remotion/interpolate";
import type { TraceVideoProps } from "../remotion/TraceVideo";

const ID = /^([a-z0-9-]+\/[a-z0-9-]+)\/[a-z0-9-]+$/;
const site = path.resolve(import.meta.dirname, "..");

async function main([id, output]: string[]) {
  const match = id === undefined ? null : ID.exec(id);
  if (!match || !output) throw new Error("usage: pnpm video <module>/<slug>/<name> <output.mp4>");
  const shown = `content/traces/${id}.json`;
  const file = path.join(site, shown);
  if (!fs.existsSync(file)) throw new Error(`${shown}: not found (run pnpm collect first)`);
  const trace = validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), shown);
  const inputProps: TraceVideoProps = { trace, page: match[1]! };

  const started = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(site, "remotion/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "TraceVideo", inputProps });
  if (composition.durationInFrames > MAX_FRAMES) {
    throw new Error(`${shown}: ${trace.steps.length} steps need ${(composition.durationInFrames / FPS).toFixed(1)} s, over the limit`);
  }
  const outputLocation = path.resolve(output);
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps });

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const bytes = fs.statSync(outputLocation).size;
  console.log(
    `wrote ${output}: ${composition.width}x${composition.height}, ${(composition.durationInFrames / FPS).toFixed(1)} s, ${bytes} bytes, in ${seconds} s`,
  );
}

main(process.argv.slice(2)).catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
