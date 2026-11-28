import { isValidElement } from "react";
import { Composition } from "remotion";
import { describe, expect, it } from "vitest";
import type { Trace } from "../lib/trace/types";
import { FPS, timeline } from "./interpolate";
import { Root } from "./Root";
import { SIZE, TraceVideo } from "./TraceVideo";

describe("Remotion root", () => {
  const element = Root();
  const props = element.props as React.ComponentProps<typeof Composition>;

  it("registers the trace video as a 1080 square at the timeline's frame rate", () => {
    expect(isValidElement(element) && element.type).toBe(Composition);
    expect(props).toMatchObject({ id: "TraceVideo", component: TraceVideo, width: SIZE, height: SIZE, fps: FPS });
    expect(SIZE).toBe(1080);
  });

  it("defaults to a titled trace with no steps, a title card long", () => {
    const empty: Trace = { version: 1, id: "none", title: "No trace given", kind: "hash-table", layout: "chains", steps: [] };
    expect(props.defaultProps).toEqual({ trace: empty });
    expect(props.durationInFrames).toBe(timeline(empty).total);
  });

  it("times the video from the trace passed in", async () => {
    const step = { caption: "x", source: null, state: { capacity: 1, size: 0, threshold: 1, buckets: [[]], focus: null, pipeline: null } };
    const trace: Trace = { version: 1, id: "t", title: "T", kind: "hash-table", layout: "chains", steps: [step, step] };
    const metadata = await props.calculateMetadata!({ props: { trace }, defaultProps: { trace }, abortSignal: new AbortController().signal, compositionId: "TraceVideo", isRendering: false });
    expect(metadata).toEqual({ durationInFrames: timeline(trace).total });
    expect(timeline(trace).total).toBeGreaterThan(props.durationInFrames!);
  });
});
