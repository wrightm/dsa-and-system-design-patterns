import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { describe, expect, it, vi } from "vitest";
import { validateTrace } from "../lib/trace/validate";
import { MAX_FRAMES } from "../remotion/interpolate";
import { FIXTURES, tempDir } from "../test/temp";
import { DEFAULTS, main, type VideoDeps } from "./render-video";

const fixture = fs.readFileSync(
  path.join(FIXTURES, "repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json"),
  "utf8",
);
const ID = "data-structures/hashmap/put";

function setUp({ trace = fixture, frames = 90 }: { trace?: string; frames?: number } = {}) {
  const site = tempDir("video-site");
  fs.mkdirSync(path.join(site, "content/traces/data-structures/hashmap"), { recursive: true });
  fs.writeFileSync(path.join(site, `content/traces/${ID}.json`), trace);
  const out: string[] = [];
  const err: string[] = [];
  const clock = [1000, 3500];
  const composition = { width: 1080, height: 1080, durationInFrames: frames };
  const deps = {
    site,
    bundle: vi.fn(async () => "http://bundle"),
    selectComposition: vi.fn(async () => composition),
    renderMedia: vi.fn(async ({ outputLocation }: { outputLocation: string }) => {
      fs.writeFileSync(outputLocation, "12345");
    }),
    now: () => clock.shift()!,
    log: (l: string) => out.push(l),
    error: (l: string) => err.push(l),
  };
  return { site, deps, typed: deps as unknown as VideoDeps, out, err, composition };
}

describe("pnpm video", () => {
  it("bundles the Remotion entry, renders the trace to the output and reports what it wrote", async () => {
    const { site, deps, typed, out, err, composition } = setUp();
    const output = path.join(tempDir("video-out"), "nested/put.mp4");
    expect(await main([ID, output], typed)).toBe(0);
    expect(err).toEqual([]);
    expect(out).toEqual([`wrote ${output}: 1080x1080, 3.0 s, 5 bytes, in 2.5 s`]);

    const trace = validateTrace(JSON.parse(fixture), "put");
    const inputProps = { trace, page: "data-structures/hashmap" };
    expect(deps.bundle).toHaveBeenCalledWith({ entryPoint: path.join(site, "remotion/index.ts") });
    expect(deps.selectComposition).toHaveBeenCalledWith({ serveUrl: "http://bundle", id: "TraceVideo", inputProps });
    expect(deps.renderMedia).toHaveBeenCalledWith({
      composition,
      serveUrl: "http://bundle",
      codec: "h264",
      outputLocation: output,
      inputProps,
    });
  });

  it("writes to a relative output path from the working folder", async () => {
    const { typed, out } = setUp();
    const dir = tempDir("video-cwd");
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir);
    try {
      expect(await main([ID, "media/put.mp4"], typed)).toBe(0);
    } finally {
      cwd.mockRestore();
    }
    expect(fs.readFileSync(path.join(dir, "media/put.mp4"), "utf8")).toBe("12345");
    expect(out[0]).toMatch(/^wrote media\/put\.mp4: /);
  });

  it.each([
    ["no arguments", []],
    ["no output", [ID]],
    ["an empty output", [ID, ""]],
    ["an id with two parts", ["data-structures/put", "a.mp4"]],
    ["an id with capitals", ["Data-structures/hashmap/put", "a.mp4"]],
    ["an id with a fourth part", [`${ID}/x`, "a.mp4"]],
    ["an id after other text", [`x ${ID}`, "a.mp4"]],
  ])("prints the usage and exits 1 given %s", async (_name, argv) => {
    const { deps, typed, out, err } = setUp();
    expect(await main(argv, typed)).toBe(1);
    expect(err).toEqual(["usage: pnpm video <module>/<slug>/<name> <output.mp4>"]);
    expect(out).toEqual([]);
    expect(deps.bundle).not.toHaveBeenCalled();
  });

  it("asks for pnpm collect when the trace has not been collected", async () => {
    const { typed, err } = setUp();
    expect(await main(["data-structures/hashmap/resize", "a.mp4"], typed)).toBe(1);
    expect(err).toEqual(["content/traces/data-structures/hashmap/resize.json: not found (run pnpm collect first)"]);
  });

  it("names the collected trace when it is invalid", async () => {
    const { typed, err } = setUp({ trace: JSON.stringify({ version: 2 }) });
    expect(await main([ID, "a.mp4"], typed)).toBe(1);
    expect(err).toEqual([`content/traces/${ID}.json: version must be 1, found 2`]);
  });

  it("refuses a video over the length limit before rendering, and accepts one at the limit", async () => {
    const over = setUp({ frames: MAX_FRAMES + 1 });
    expect(await main([ID, path.join(tempDir("video-out"), "a.mp4")], over.typed)).toBe(1);
    expect(over.err).toEqual([`content/traces/${ID}.json: 2 steps need 59.0 s, over the limit`]);
    expect(over.deps.renderMedia).not.toHaveBeenCalled();

    const limit = setUp({ frames: MAX_FRAMES });
    expect(await main([ID, path.join(tempDir("video-out"), "a.mp4")], limit.typed)).toBe(0);
    expect(limit.out[0]).toContain(", 59.0 s, ");
  });

  it("defaults to this site, Remotion, the clock and the console", () => {
    expect(DEFAULTS).toEqual({
      site: path.resolve(import.meta.dirname, ".."),
      bundle,
      selectComposition,
      renderMedia,
      now: Date.now,
      log: console.log,
      error: console.error,
    });
  });
});
