// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Step, Trace } from "../lib/trace/types";
import { FIXTURES, tempDir, writeFiles } from "../test/temp";
import { Animation, excerptsOf, loadTrace } from "./Animation";

const ID = "data-structures/hashmap/put";
const fixture = fs.readFileSync(
  path.join(FIXTURES, "repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json"),
  "utf8",
);
const twenty = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");

/** A site folder holding content/ as `pnpm collect` writes it. */
function site(files: Record<string, string> = {}) {
  const dir = tempDir("animation");
  writeFiles(path.join(dir, "content"), {
    [`traces/${ID}.json`]: fixture,
    "sources/data-structures/hashmap/ChainedHashMap.java": "package learn.ds.hashmap;\n\nfinal class ChainedHashMap {}\n",
    "sources/data-structures/hashmap/Twenty.java": twenty,
    "sources/data-structures/hashmap/Windows.java": "one\r\ntwo\r\nthree\r\n",
    ...files,
  });
  return { dir, content: path.join(dir, "content") };
}

const state: Step["state"] = { capacity: 2, size: 0, threshold: 1, buckets: [[], []], focus: null, pipeline: null };
const at = (file: string, line: number): Step => ({ caption: `${file}:${line}`, source: { file, line }, state });
const traceOf = (...steps: Step[]): Trace => ({ version: 1, id: "t", title: "T", kind: "hash-table", layout: "chains", steps });

describe("loadTrace", () => {
  it("returns the validated trace", () => {
    const trace = loadTrace(ID, site().content);
    expect(trace.title).toBe("One put");
    expect(trace.steps.map((s) => s.caption)).toEqual(['put("a") hashes to bucket 1.', "The node is stored."]);
  });

  it.each([["data-structures/put"], ["Data-structures/hashmap/put"], [`${ID}/x`], [`../${ID}`], [`x ${ID}`], [`${ID} x`]])(
    "rejects the id %j before reading anything",
    (id) => {
      expect(() => loadTrace(id, site().content)).toThrow(
        `Animation: id must be <module>/<slug>/<name>, found ${JSON.stringify(id)}`,
      );
    },
  );

  it("names the missing trace", () => {
    expect(() => loadTrace("data-structures/hashmap/resize", site().content)).toThrow(
      "content/traces/data-structures/hashmap/resize.json: no trace for animation data-structures/hashmap/resize",
    );
  });

  it("names a trace that is not JSON, with the parser's reason", () => {
    const { content } = site({ [`traces/${ID}.json`]: "{ nope" });
    expect(() => loadTrace(ID, content)).toThrow(/^content\/traces\/data-structures\/hashmap\/put\.json: not valid JSON \(.+\)$/);
  });

  it("names a trace that is not a valid trace", () => {
    const { content } = site({ [`traces/${ID}.json`]: JSON.stringify({ version: 2 }) });
    expect(() => loadTrace(ID, content)).toThrow(`content/traces/${ID}.json: version must be 1, found 2`);
  });
});

describe("excerptsOf", () => {
  const { content } = site();
  const excerpts = (...steps: Step[]) => excerptsOf(traceOf(...steps), ID, content);

  it("cuts three lines either side of each step's line, keyed by file and line", () => {
    expect(excerpts(at("Twenty.java", 10))).toEqual({
      "Twenty.java:10": { file: "Twenty.java", line: 10, start: 7, lines: ["line 7", "line 8", "line 9", "line 10", "line 11", "line 12", "line 13"] },
    });
  });

  it("stops at the start and the end of the file", () => {
    expect(excerpts(at("Twenty.java", 2), at("Twenty.java", 4), at("Twenty.java", 20))).toEqual({
      "Twenty.java:2": { file: "Twenty.java", line: 2, start: 1, lines: ["line 1", "line 2", "line 3", "line 4", "line 5"] },
      "Twenty.java:4": {
        file: "Twenty.java",
        line: 4,
        start: 1,
        lines: ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7"],
      },
      "Twenty.java:20": { file: "Twenty.java", line: 20, start: 17, lines: ["line 17", "line 18", "line 19", "line 20"] },
    });
  });

  it("reads Windows line endings and drops the final newline", () => {
    expect(excerpts(at("Windows.java", 3))["Windows.java:3"]!.lines).toEqual(["one", "two", "three"]);
  });

  it("skips steps with no line and repeats of a line already cut", () => {
    const none: Step = { caption: "none", source: null, state };
    expect(Object.keys(excerpts(none, at("Twenty.java", 5), at("Twenty.java", 5), none))).toEqual(["Twenty.java:5"]);
    expect(excerpts(none)).toEqual({});
  });

  it("reads each file once however many lines it names", () => {
    const read = vi.spyOn(fs, "readFileSync");
    try {
      excerpts(at("Twenty.java", 1), at("Twenty.java", 9), at("Windows.java", 1));
      expect(read.mock.calls.map(([file]) => path.basename(String(file)))).toEqual(["Twenty.java", "Windows.java"]);
    } finally {
      read.mockRestore();
    }
  });

  it("names a source file that was not collected", () => {
    expect(() => excerpts(at("Missing.java", 1))).toThrow(`content/traces/${ID}.json: source file not found: Missing.java`);
  });

  it.each([0, 21])("names line %i, outside the file, with the file's length", (line) => {
    expect(() => excerpts(at("Twenty.java", line))).toThrow(
      `content/traces/${ID}.json: line ${line} is outside Twenty.java, which has 20 lines`,
    );
  });
});

describe("Animation", () => {
  afterEach(() => vi.restoreAllMocks());

  function render(files?: Record<string, string>) {
    vi.spyOn(process, "cwd").mockReturnValue(site(files).dir);
    const markup = renderToStaticMarkup(<Animation id={ID} alt="One put into a two-bucket table" />);
    return new DOMParser().parseFromString(`<body>${markup}</body>`, "text/html");
  }

  it("renders the player for the trace in the site's content folder", () => {
    const doc = render();
    const player = doc.querySelector("body > div[data-animation-player]")!;
    expect(player.querySelector("figure")!.getAttribute("aria-label")).toBe("Animation: One put");
    expect(player.querySelector('svg[role="img"]')!.getAttribute("aria-label")).toBe("One put into a two-bucket table");
    expect(player.querySelector("[aria-live]")!.textContent).toBe('put("a") hashes to bucket 1.');
    // The first step names line 3, so the excerpt shows it from the collected source.
    expect(player.querySelector("[data-current]")!.textContent).toBe("Current line: 3final class ChainedHashMap {}");
    expect(player.textContent).toContain("step 1 of 2");
  });

  it("puts the still and a rule hiding the player in a noscript", () => {
    const noscript = render().querySelector("body > noscript")!;
    expect(noscript.innerHTML).toBe(
      "<style>[data-animation-player]{display:none}</style>" +
        `<img src="/generated/animations/${ID}.svg" alt="One put into a two-bucket table" class="my-6">`,
    );
  });

  it("ships the browser the slimmed state, with no node values", () => {
    const trace = JSON.parse(fixture);
    trace.steps[1].state.buckets[1][0].value = "VALUE-NOT-SHIPPED";
    const again = render({ [`traces/${ID}.json`]: JSON.stringify(trace) }).body.innerHTML;
    expect(again).not.toContain("VALUE-NOT-SHIPPED");
  });

  it("fails the build, naming the trace, when the trace is missing", () => {
    vi.spyOn(process, "cwd").mockReturnValue(tempDir("animation-empty"));
    expect(() => renderToStaticMarkup(<Animation id={ID} alt="x" />)).toThrow(
      `content/traces/${ID}.json: no trace for animation ${ID}`,
    );
  });
});
