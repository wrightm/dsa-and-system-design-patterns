// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { layoutTrace, slimState } from "../lib/render/hash-table/layout";
import type { Trace } from "../lib/trace/types";
import { validateTrace } from "../lib/trace/validate";
import { FIXTURES } from "../test/temp";
import { timeline } from "./interpolate";
import { StepCard, TitleCard, TraceVideo } from "./TraceVideo";

// Remotion supplies the frame number while it renders; here each test sets it.
const frame = vi.hoisted(() => ({ now: 0 }));
vi.mock("remotion", async (real) => ({ ...(await real<typeof import("remotion")>()), useCurrentFrame: () => frame.now }));

// A quote, a backslash, markup characters, a newline and a non-ASCII letter.
const awkward = 'a"b\\c<&\nü';

const trace: Trace = {
  version: 1,
  id: "test/awkward",
  title: `Title ${awkward}`,
  kind: "hash-table",
  layout: "chains",
  steps: [
    {
      caption: `Caption ${awkward}`,
      source: null,
      state: {
        capacity: 2,
        size: 1,
        threshold: 1,
        buckets: [[{ id: "k:x", key: awkward, value: "v", hash: "0x0" }], []],
        focus: null,
        pipeline: null,
      },
    },
  ],
};

function parse(markup: string): Document {
  return new DOMParser().parseFromString(markup, "text/html");
}

/** The innermost div whose text is exactly `text`. */
function divHolding(doc: Document, text: string): HTMLElement | undefined {
  return Array.from(doc.querySelectorAll("div")).findLast((d) => d.textContent === text);
}

describe("TraceVideo text", () => {
  it("the title card escapes the title and keeps its newline", () => {
    const markup = renderToStaticMarkup(<TitleCard trace={trace} />);
    expect(markup).toContain("a&quot;b\\c&lt;&amp;\nü");
    const title = divHolding(parse(markup), trace.title);
    expect(title, "an element holding exactly the title").toBeDefined();
    expect(title!.style.whiteSpace).toBe("pre-wrap");
  });

  it("a step card escapes the caption and the key and keeps the caption's newline", () => {
    const scene = layoutTrace([slimState(trace.steps[0]!.state, "chains")], "chains")[0]!;
    const markup = renderToStaticMarkup(<StepCard trace={trace} index={0} scene={scene} />);
    expect(markup).not.toContain("<&");
    const doc = parse(markup);
    const caption = divHolding(doc, trace.steps[0]!.caption);
    expect(caption, "an element holding exactly the caption").toBeDefined();
    expect(caption!.style.whiteSpace).toBe("pre-wrap");
    const texts = Array.from(doc.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain(awkward);
  });
});

const put = validateTrace(
  JSON.parse(
    fs.readFileSync(
      path.join(FIXTURES, "repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json"),
      "utf8",
    ),
  ),
  "put",
);

/** The video at frame `at`, parsed. */
function videoAt(at: number, props: { trace: Trace; page?: string } = { trace: put, page: "data-structures/hashmap" }) {
  frame.now = at;
  return parse(renderToStaticMarkup(<TraceVideo {...props} />));
}

/** The opacity of every item the drawing places, in order; a fully shown item carries none. */
const opacities = (doc: Document) => Array.from(doc.querySelectorAll("svg > g"), (g) => g.getAttribute("opacity") ?? "1");

describe("TraceVideo frames", () => {
  const tl = timeline(put);
  const [first, second] = tl.steps;

  it("opens on the title card, on white, in a sans-serif face", () => {
    const doc = videoAt(0);
    const root = doc.body.firstElementChild as HTMLElement;
    expect(root.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(root.style.fontFamily).toBe('"Helvetica Neue", Helvetica, Arial, sans-serif');
    expect(doc.body.textContent).toBe("One put2 steps recorded from a hash map written in Java");
    expect(videoAt(tl.title - 1).body.textContent).toBe(doc.body.textContent);
  });

  it("names one step in the singular and an empty trace as having none", () => {
    const one = { ...put, steps: put.steps.slice(0, 1) };
    expect(videoAt(0, { trace: one }).body.textContent).toBe("One put1 step recorded from a hash map written in Java");
    expect(videoAt(0, { trace: { ...put, steps: [] } }).body.textContent).toBe("One putNo steps recorded");
  });

  it("draws the first step in place from its first frame, with no fading", () => {
    const doc = videoAt(first!.start);
    expect(doc.body.textContent).toContain("Step 1 of 2");
    expect(opacities(doc).length).toBeGreaterThan(0);
    expect(opacities(doc).every((o) => o === "1")).toBe(true);
  });

  it("eases the next step in: new items fade in and items leaving fade out, sized for the new step", () => {
    // 3 frames into a 15-frame move is t = 0.2, eased to 0.2 * 0.2 * (3 - 0.4) = 0.104.
    const moving = videoAt(second!.start + 3);
    const settled = videoAt(second!.start + tl.transition);
    expect(moving.body.textContent).toContain("Step 2 of 2");
    const shown = opacities(moving).map(Number);
    expect(shown.some((o) => Math.abs(o - 0.104) < 1e-9)).toBe(true);
    expect(shown.some((o) => Math.abs(o - 0.896) < 1e-9)).toBe(true);
    expect(moving.querySelector("svg")!.getAttribute("viewBox")).toBe(settled.querySelector("svg")!.getAttribute("viewBox"));
    expect(opacities(settled).every((o) => o === "1")).toBe(true);
  });

  it("ends on a card naming the article's page, or the site alone without one", () => {
    const lines = (doc: Document) => Array.from(doc.querySelectorAll("div > div > div > div"), (d) => d.textContent);
    expect(lines(videoAt(tl.end))).toEqual(["wrightm.github.io", "/dsa-and-system-design-patterns", "/data-structures/hashmap/"]);
    expect(videoAt(tl.total - 1).body.textContent).toContain("The article, code and tests, with this animation to step through:");
    expect(lines(videoAt(tl.end, { trace: put }))).toEqual(["wrightm.github.io", "/dsa-and-system-design-patterns"]);
  });
});
