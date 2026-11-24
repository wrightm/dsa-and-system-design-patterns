import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Scene, SceneItem } from "../lib/render/hash-table/layout";
import type { Step, Trace } from "../lib/trace/types";
import { validateTrace } from "../lib/trace/validate";
import { FPS, MAX_FRAMES, at, mergeScenes, positionsAt, timeline } from "./interpolate";

const item = (id: string, x: number, y: number): SceneItem => ({ id, kind: "node", x, y, w: 40, h: 28, text: id });
const scene = (...items: SceneItem[]): Scene => ({ width: 400, height: 400, items });

// "moved" travels from bucket 1 to bucket 17; "stays" does not move; "old" only exists before; "added" only after.
const from = scene(item("moved", 60, 100), item("stays", 0, 0), item("old", 200, 50));
const to = scene(item("moved", 260, 300), item("stays", 0, 0), item("added", 120, 80));

describe("positionsAt", () => {
  it("equals the from scene at t = 0 and the to scene at t = 1", () => {
    expect(positionsAt(from, to, 0)).toEqual({
      moved: { x: 60, y: 100, opacity: 1 },
      stays: { x: 0, y: 0, opacity: 1 },
      old: { x: 200, y: 50, opacity: 1 },
      added: { x: 120, y: 80, opacity: 0 },
    });
    expect(positionsAt(from, to, 1)).toEqual({
      moved: { x: 260, y: 300, opacity: 1 },
      stays: { x: 0, y: 0, opacity: 1 },
      old: { x: 200, y: 50, opacity: 0 },
      added: { x: 120, y: 80, opacity: 1 },
    });
  });

  it("puts a moved item halfway at t = 0.5", () => {
    expect(positionsAt(from, to, 0.5).moved).toEqual({ x: 160, y: 200, opacity: 1 });
  });

  it("fades an item in only where it lands, and an item out only where it was", () => {
    expect(positionsAt(from, to, 0.25).added).toEqual({ x: 120, y: 80, opacity: 0.25 });
    expect(positionsAt(from, to, 0.25).old).toEqual({ x: 200, y: 50, opacity: 0.75 });
  });

  it("clamps t to 0..1", () => {
    expect(positionsAt(from, to, 1.7)).toEqual(positionsAt(from, to, 1));
    expect(positionsAt(from, to, -3)).toEqual(positionsAt(from, to, 0));
    expect(positionsAt(from, to, Number.NaN)).toEqual(positionsAt(from, to, 0));
  });

  it("holds every item still when both scenes are the same", () => {
    for (const t of [0, 0.3, 1]) {
      expect(positionsAt(from, from, t)).toEqual({
        moved: { x: 60, y: 100, opacity: 1 },
        stays: { x: 0, y: 0, opacity: 1 },
        old: { x: 200, y: 50, opacity: 1 },
      });
    }
  });
});

describe("mergeScenes", () => {
  it("draws the to scene's items plus those fading out of the from scene", () => {
    const merged = mergeScenes(from, to);
    expect(merged.items.map((i) => i.id)).toEqual(["old", "moved", "stays", "added"]);
    // An item in both scenes is drawn as it is in the to scene (its new emphasis and text).
    expect(merged.items.find((i) => i.id === "moved")).toBe(to.items[0]);
  });
});

const caption = (chars: number) => "x".repeat(chars);
const traceOf = (captions: string[]): Trace => ({
  version: 1,
  id: "test",
  title: "Test",
  kind: "hash-table",
  layout: "chains",
  steps: captions.map(
    (c): Step => ({
      caption: c,
      source: null,
      state: { capacity: 1, size: 0, threshold: 0, buckets: [[]], focus: null, pipeline: null },
    }),
  ),
});

describe("timeline", () => {
  it("gives a trace with no steps a title card alone, never zero frames", () => {
    const tl = timeline(traceOf([]));
    expect(tl.total).toBeGreaterThan(0);
    expect(tl.steps).toEqual([]);
    expect(tl.end).toBe(tl.total);
    for (const frame of [0, tl.total - 1]) expect(at(tl, frame)).toEqual({ kind: "title" });
  });

  it("holds a single step with no transition into it, then the end card", () => {
    const tl = timeline(traceOf(["one"]));
    const [only] = tl.steps;
    expect(only!.start).toBe(tl.title);
    expect(at(tl, only!.start)).toEqual({ kind: "step", index: 0, t: 1 });
    expect(at(tl, tl.end - 1)).toEqual({ kind: "step", index: 0, t: 1 });
    expect(at(tl, tl.end)).toEqual({ kind: "end" });
    expect(at(tl, tl.total - 1)).toEqual({ kind: "end" });
  });

  it("holds a longer caption longer, within bounds", () => {
    const tl = timeline(traceOf([caption(10), caption(150), caption(5000)]));
    const [short, long, huge] = tl.steps.map((s) => s.frames);
    expect(short!).toBeGreaterThanOrEqual(2 * FPS);
    expect(long!).toBeGreaterThan(short!);
    expect(huge!).toBeLessThanOrEqual(6 * FPS);
  });

  it("tweens into each step after the first, from the step before", () => {
    const tl = timeline(traceOf(["one", "two"]));
    const second = tl.steps[1]!;
    expect(at(tl, second.start)).toEqual({ kind: "step", index: 1, t: 0 });
    const mid = at(tl, second.start + tl.transition / 2);
    expect(mid).toMatchObject({ kind: "step", index: 1 });
    expect(mid.kind === "step" && mid.t > 0 && mid.t < 1).toBe(true);
    expect(at(tl, second.start + tl.transition)).toEqual({ kind: "step", index: 1, t: 1 });
  });

  it("covers every frame, and clamps frames outside the video", () => {
    const tl = timeline(traceOf(["a", "b", "c"]));
    expect(tl.steps.at(-1)!.start + tl.steps.at(-1)!.frames).toBe(tl.end);
    expect(at(tl, -5)).toEqual({ kind: "title" });
    expect(at(tl, tl.total + 100)).toEqual({ kind: "end" });
  });

  it("keeps a trace with many long captions under a minute", () => {
    const tl = timeline(traceOf(Array.from({ length: 40 }, () => caption(200))));
    expect(tl.total).toBeLessThanOrEqual(MAX_FRAMES);
    expect(tl.total).toBeLessThan(60 * FPS);
  });

  it("fits the recorded put trace in under a minute, every frame a whole number", () => {
    const file = path.resolve(
      import.meta.dirname,
      "../../data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json",
    );
    const trace = validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), file);
    const tl = timeline(trace);
    expect(tl.steps).toHaveLength(13);
    expect(tl.total).toBeLessThan(60 * FPS);
    for (const step of tl.steps) expect(Number.isInteger(step.frames)).toBe(true);
  });
});
