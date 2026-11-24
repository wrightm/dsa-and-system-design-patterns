// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { layoutTrace, slimState } from "../lib/render/hash-table/layout";
import type { Trace } from "../lib/trace/types";
import { StepCard, TitleCard } from "./TraceVideo";

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
