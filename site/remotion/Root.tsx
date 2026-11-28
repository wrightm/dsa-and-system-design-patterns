import { Composition } from "remotion";
import { FPS, timeline } from "./interpolate";
import { SIZE, TraceVideo, type TraceVideoProps } from "./TraceVideo";

/** Shown in Remotion Studio until a trace is passed in; `pnpm video` always passes one. */
const NO_TRACE: TraceVideoProps = {
  trace: { version: 1, id: "none", title: "No trace given", kind: "hash-table", layout: "chains", steps: [] },
};

export function Root() {
  return (
    <Composition
      id="TraceVideo"
      component={TraceVideo}
      width={SIZE}
      height={SIZE}
      fps={FPS}
      durationInFrames={timeline(NO_TRACE.trace).total}
      defaultProps={NO_TRACE}
      calculateMetadata={({ props }) => ({ durationInFrames: timeline(props.trace).total })}
    />
  );
}
