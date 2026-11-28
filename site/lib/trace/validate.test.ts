import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "../../test/temp";
import { validateTrace } from "./validate";

const file = path.join(FIXTURES, "repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json");
// Untyped: each test breaks the parsed trace in its own way.
const load = (): any => JSON.parse(fs.readFileSync(file, "utf8"));

describe("validateTrace", () => {
  it("returns the trace, field for field, and nothing more", () => {
    const json = load();
    const extra = { ...json, extra: true, steps: json.steps.map((s: object) => ({ ...s, extra: true })) };
    expect(validateTrace(extra, "put.trace.json")).toEqual(json);
  });

  it("accepts a trace with no steps", () => {
    expect(validateTrace({ ...load(), steps: [] }, "empty.trace.json").steps).toEqual([]);
  });

  it("accepts the grid layout", () => {
    expect(validateTrace({ ...load(), layout: "grid" }, "g.trace.json").layout).toBe("grid");
  });

  it("accepts a focus on a node", () => {
    const t = load();
    t.steps[1].state.focus = { bucket: 1, node: "k:a" };
    expect(validateTrace(t, "f.trace.json").steps[1]!.state.focus).toEqual({ bucket: 1, node: "k:a" });
  });

  // Each case breaks one thing in the fixture; the message names the file and what is wrong.
  it.each<[string, (t: any) => unknown]>([
    ["trace must be an object", () => null],
    ["trace must be an object", () => [1]],
    ["trace must be an object", () => "trace"],
    ["version must be 1, found 2", (t) => ({ ...t, version: 2 })],
    ["version must be 1, found undefined", (t) => ({ ...t, version: undefined })],
    ['unknown kind "heap"', (t) => ({ ...t, kind: "heap" })],
    ['unknown layout "ring"', (t) => ({ ...t, layout: "ring" })],
    ["steps must be an array", (t) => ({ ...t, steps: {} })],
    ["trace.id must be a string", (t) => ({ ...t, id: 1 })],
    ["trace.title must be a string", (t) => ({ ...t, title: null })],
    ["steps[1] must be an object", (t) => ({ ...t, steps: [t.steps[0], null] })],
    ["steps[0].source is missing", (t) => (delete t.steps[0].source, t)],
    ["steps[1].state is missing", (t) => (delete t.steps[1].state, t)],
    ["steps[0].caption must be a string", (t) => ((t.steps[0].caption = 1), t)],
    ["steps[0].source must be an object", (t) => ((t.steps[0].source = "x"), t)],
    ["steps[0].source.file must be a string", (t) => ((t.steps[0].source.file = 1), t)],
    ["steps[0].source.line must be an integer", (t) => ((t.steps[0].source.line = 1.5), t)],
    ["steps[0].state must be an object", (t) => ((t.steps[0].state = []), t)],
    ["steps[0].state.buckets must be an array", (t) => ((t.steps[0].state.buckets = {}), t)],
    ["steps[1].state.buckets[1] must be an array", (t) => ((t.steps[1].state.buckets[1] = null), t)],
    ["steps[1].state.buckets[1][0] must be an object", (t) => ((t.steps[1].state.buckets[1][0] = 1), t)],
    ["steps[1].state.buckets[1][0].id must be a string", (t) => (delete t.steps[1].state.buckets[1][0].id, t)],
    ["steps[1].state.buckets[1][0].key must be a string", (t) => (delete t.steps[1].state.buckets[1][0].key, t)],
    ["steps[1].state.buckets[1][0].value must be a string", (t) => (delete t.steps[1].state.buckets[1][0].value, t)],
    ["steps[1].state.buckets[1][0].hash must be a string", (t) => (delete t.steps[1].state.buckets[1][0].hash, t)],
    ["steps[0].state.focus is missing", (t) => (delete t.steps[0].state.focus, t)],
    ["steps[0].state.pipeline is missing", (t) => (delete t.steps[0].state.pipeline, t)],
    ["steps[0].state.capacity must be an integer", (t) => (delete t.steps[0].state.capacity, t)],
    ["steps[0].state.size must be an integer", (t) => ((t.steps[0].state.size = "0"), t)],
    ["steps[0].state.threshold must be an integer", (t) => (delete t.steps[0].state.threshold, t)],
    ["steps[0].state.focus must be an object", (t) => ((t.steps[0].state.focus = 1), t)],
    ["steps[0].state.focus.node must be a string or null", (t) => ((t.steps[0].state.focus.node = 1), t)],
    ["steps[0].state.focus.bucket must be an integer", (t) => (delete t.steps[0].state.focus.bucket, t)],
    ["steps[0].state.pipeline must be an object", (t) => ((t.steps[0].state.pipeline = true), t)],
    ["steps[0].state.pipeline.key must be a string", (t) => (delete t.steps[0].state.pipeline.key, t)],
    ["steps[0].state.pipeline.hashCode must be a string", (t) => (delete t.steps[0].state.pipeline.hashCode, t)],
    ["steps[0].state.pipeline.spread must be a string", (t) => (delete t.steps[0].state.pipeline.spread, t)],
    ["steps[0].state.pipeline.index must be an integer", (t) => (delete t.steps[0].state.pipeline.index, t)],
  ])("rejects a trace where %s", (message, breakIt) => {
    expect(() => validateTrace(breakIt(load()), "t.trace.json")).toThrow(new Error(`t.trace.json: ${message}`));
  });

  it("passes on, unchanged, an error that is not about the trace's shape", () => {
    const failure = new RangeError("read failed");
    const trace = {
      ...load(),
      get steps(): never {
        throw failure;
      },
    };
    expect(() => validateTrace(trace, "t.trace.json")).toThrow(failure);
  });
});
