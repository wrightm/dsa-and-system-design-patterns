// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Trace } from "../trace/types";
import { validateTrace } from "../trace/validate";
import { findTraces, renderStill, stillPathOf } from "./stills";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const putFile = path.join(repoRoot, "data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json");

function load(file: string): Trace {
  return validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), file);
}

function parse(svg: string): Document {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
}

// Markup characters, quotes, a backslash and a non-ASCII letter.
const awkward = `a<b&"c"\\ü`;

const awkwardTrace: Trace = {
  version: 1,
  id: "test/awkward",
  title: `Keys & <markup>`,
  kind: "hash-table",
  layout: "chains",
  steps: [
    {
      caption: `put(${awkward}) lands in\nbucket 0 & stays.`,
      source: null,
      state: {
        capacity: 2,
        size: 1,
        threshold: 1,
        buckets: [[{ id: "k:x", key: awkward, value: "v", hash: "0x0" }], []],
        focus: { bucket: 0, node: "k:x" },
        pipeline: { key: awkward, hashCode: "0x00000001", spread: "0x00000001", index: 0 },
      },
    },
  ],
};

describe("renderStill", () => {
  it("is a standalone SVG document titled with the trace's title", () => {
    const trace = load(putFile);
    const svg = renderStill(trace);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    const doc = parse(svg);
    expect(doc.documentElement.getElementsByTagName("title")[0]!.textContent).toBe(trace.title);
    expect(svg).toContain("Interactive version on the site");
  });

  it("draws the last step and its caption", () => {
    const trace = load(putFile);
    const doc = parse(renderStill(trace));
    const keys = Array.from(doc.getElementsByTagName("text")).map((t) => t.textContent);
    for (const key of ["alice", "bob", "carol", "dave"]) expect(keys).toContain(key);
    const lines = Array.from(doc.getElementsByTagName("tspan")).map((t) => t.textContent);
    expect(lines.join(" ")).toContain(trace.steps.at(-1)!.caption);
  });

  it("escapes text from the trace into well-formed XML", () => {
    const svg = renderStill(awkwardTrace);
    expect(svg).toContain("a&lt;b&amp;");
    const doc = parse(svg);
    const texts = Array.from(doc.getElementsByTagName("text")).map((t) => t.textContent);
    expect(texts).toContain(awkward);
    expect(doc.getElementsByTagName("title")[0]!.textContent).toBe("Keys & <markup>");
    expect(doc.getElementsByTagName("script")).toHaveLength(0);
  });

  it("wraps a caption on whitespace, so a newline in it becomes a space in the still", () => {
    const doc = parse(renderStill(awkwardTrace));
    const lines = Array.from(doc.getElementsByTagName("tspan")).map((t) => t.textContent);
    expect(lines.join(" ")).toContain(`put(${awkward}) lands in bucket 0 & stays.`);
    expect(lines.some((line) => line!.includes("\n"))).toBe(false);
  });

  it("draws an empty frame with the title for a trace with no steps", () => {
    const svg = renderStill({ ...awkwardTrace, steps: [] });
    const doc = parse(svg);
    expect(doc.getElementsByTagName("title")[0]!.textContent).toBe("Keys & <markup>");
    expect(doc.getElementsByTagName("rect").length).toBeGreaterThan(0); // the background
  });

  it("is deterministic", () => {
    const trace = load(putFile);
    expect(renderStill(trace)).toBe(renderStill(load(putFile)));
  });
});

describe("committed stills", () => {
  const traces = findTraces(repoRoot);

  it("finds the article traces and skips the site", () => {
    const shown = traces.map((f) => path.relative(repoRoot, f));
    expect(shown).toContain("data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json");
    expect(shown.filter((f) => f.startsWith("site/"))).toEqual([]);
  });

  it.each(traces.map((f) => [path.relative(repoRoot, f), f]))("%s has an up-to-date still", (_shown, file) => {
    const still = stillPathOf(file);
    const committed = fs.existsSync(still) ? fs.readFileSync(still, "utf8") : null;
    const fresh = renderStill(load(file));
    expect(committed === fresh, `stale still: ${path.relative(repoRoot, still)}. Run pnpm stills`).toBe(true);
  });
});
