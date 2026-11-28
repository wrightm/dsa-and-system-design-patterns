// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Trace } from "../trace/types";
import { validateTrace } from "../trace/validate";
import { REPO_ROOT as repoRoot } from "../../test/repo-root";
import { tempDir, writeFiles } from "../../test/temp";
import { findTraces, renderStill, stillPathOf, wrap } from "./stills";

afterEach(() => {
  vi.restoreAllMocks();
});

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
    // 352 wide: 320 and a 16 margin each side. 81 high: the title's 21 and 12 below it, the
    // note's 15.4, and the margins, rounded up.
    expect(doc.documentElement.getAttribute("width")).toBe("352");
    expect(doc.documentElement.getAttribute("height")).toBe("81");
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 352 81");
    const texts = Array.from(doc.getElementsByTagName("text"), (t) => t.textContent);
    expect(texts).toEqual(["Keys & <markup>", "Interactive version on the site"]);
    expect(doc.getElementsByTagName("rect")).toHaveLength(1); // the background
  });

  it("is deterministic", () => {
    const trace = load(putFile);
    expect(renderStill(trace)).toBe(renderStill(load(putFile)));
  });
});

describe("wrap", () => {
  it.each<[string, number, string[]]>([
    ["", 5, []],
    ["  \n ", 5, []],
    [" a  b ", 5, ["a b"]],
    ["one two three", 7, ["one two", "three"]],
    ["one two", 7, ["one two"]],
    ["ab cd", 4, ["ab", "cd"]],
    ["abcdefgh", 3, ["abc", "def", "gh"]],
    ["abcdef", 3, ["abc", "def"]],
    ["ab abcdefg x", 3, ["ab", "abc", "def", "g x"]],
    ["😀😀😀😀", 3, ["😀😀😀", "😀"]],
  ])("cuts %j into lines of %i", (text, max, lines) => {
    expect(wrap(text, max)).toEqual(lines);
  });
});

describe("committed stills", () => {
  const traces = findTraces(repoRoot);

  it("finds the article traces and skips the site", () => {
    const shown = traces.map((f) => path.relative(repoRoot, f));
    expect(shown).toContain("data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json");
    expect(shown.filter((f) => f.startsWith("site/"))).toEqual([]);
  });

  it("skips build output, dependencies, the site and dot-folders, and sorts what it finds", () => {
    const root = tempDir("traces");
    const files = ["b/x.trace.json", "a/x.trace.json", "a/y.trace.json"];
    writeFiles(root, {
      ...Object.fromEntries(files.map((f) => [f, "{}"])),
      "node_modules/m/x.trace.json": "{}",
      "a/build/x.trace.json": "{}",
      "site/x.trace.json": "{}",
      ".git/x.trace.json": "{}",
      "a/x.trace.json.bak": "{}",
    });
    const list = fs.readdirSync;
    vi.spyOn(fs, "readdirSync").mockImplementation(((dir: fs.PathLike, options: never) =>
      (list(dir, options) as unknown[]).reverse()) as typeof fs.readdirSync);
    expect(findTraces(root).map((f) => path.relative(root, f))).toEqual(["a/x.trace.json", "a/y.trace.json", "b/x.trace.json"]);
  });

  it("puts a still beside its trace, replacing only the final extension", () => {
    expect(stillPathOf("/r/a.trace.json/put.trace.json")).toBe("/r/a.trace.json/put.svg");
  });

  it.each(traces.map((f) => [path.relative(repoRoot, f), f]))("%s has an up-to-date still", (_shown, file) => {
    const still = stillPathOf(file);
    const committed = fs.existsSync(still) ? fs.readFileSync(still, "utf8") : null;
    const fresh = renderStill(load(file));
    expect(committed === fresh, `stale still: ${path.relative(repoRoot, still)}. Run pnpm stills`).toBe(true);
  });
});
