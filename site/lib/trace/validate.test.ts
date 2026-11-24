import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTrace } from "./validate";

const file = path.resolve(
  import.meta.dirname,
  "../../test/fixtures/repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json",
);
const load = (): any => JSON.parse(fs.readFileSync(file, "utf8"));

describe("validateTrace", () => {
  it("accepts the fixture", () => {
    const trace = validateTrace(load(), "put.trace.json");
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[1]!.source).toBeNull();
    expect(trace.steps[1]!.state.focus).toBeNull();
  });

  it("accepts a trace with no steps", () => {
    expect(validateTrace({ ...load(), steps: [] }, "empty.trace.json").steps).toEqual([]);
  });

  it("accepts the grid layout", () => {
    expect(validateTrace({ ...load(), layout: "grid" }, "g.trace.json").layout).toBe("grid");
  });

  it("rejects version 2", () => {
    expect(() => validateTrace({ ...load(), version: 2 }, "v2.trace.json")).toThrow(/^v2\.trace\.json: /);
  });

  it("rejects an unknown kind", () => {
    expect(() => validateTrace({ ...load(), kind: "heap" }, "heap.trace.json")).toThrow(
      /^heap\.trace\.json: .*kind/,
    );
  });

  it("rejects an unknown layout", () => {
    expect(() => validateTrace({ ...load(), layout: "ring" }, "r.trace.json")).toThrow(/^r\.trace\.json: .*layout/);
  });

  it("rejects a step with no state", () => {
    const t = load();
    delete t.steps[1].state;
    expect(() => validateTrace(t, "nostate.trace.json")).toThrow(/^nostate\.trace\.json: .*steps\[1\]\.state/);
  });

  it("rejects a missing state field and a malformed node", () => {
    const a = load();
    delete a.steps[0].state.threshold;
    expect(() => validateTrace(a, "a.trace.json")).toThrow(/^a\.trace\.json: .*threshold/);
    const b = load();
    delete b.steps[1].state.buckets[1][0].hash;
    expect(() => validateTrace(b, "b.trace.json")).toThrow(/^b\.trace\.json: .*hash/);
  });

  it("rejects non-objects", () => {
    expect(() => validateTrace(null, "n.trace.json")).toThrow(/^n\.trace\.json: /);
  });
});
