import { type ReactNode, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT_SIZE, HashTableDrawing, type Positions } from "../lib/render/hash-table/HashTableSvg";
import { type Scene, layoutTrace, slimState } from "../lib/render/hash-table/layout";
import { LIGHT } from "../lib/render/hash-table/palette";
import type { Trace } from "../lib/trace/types";
import { at, mergeScenes, positionsAt, timeline } from "./interpolate";

export const SIZE = 1080;
const SITE = ["wrightm.github.io", "/dsa-and-system-design-patterns"];

export type TraceVideoProps = {
  trace: Trace;
  /** The article's page under the site, e.g. `data-structures/hashmap`, for the end card. */
  page?: string;
};

// Square for the LinkedIn feed, which can show the frame at about a third of its size. Nothing
// within 64px of an edge; captions 38px. The drawing fills the space the captions leave, so its
// 13-unit text draws at about 24px for the put trace. The step's source line is left out: the
// Java lines run to 70 characters, which would need a font well under the caption size.
const MARGIN = 64;
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const CAPTION_SIZE = 38;
const CAPTION_LINE = 1.3;
const COUNTER_SIZE = 30;
const GAP = 28;
const DRAWING_PAD = 8;

/** Ease in and out, so a moving node starts and stops gently. */
const smooth = (t: number) => t * t * (3 - 2 * t);

function Card({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        padding: MARGIN,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: 40,
        color: LIGHT.text,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Exported for tests, which render it outside Remotion. */
export function TitleCard({ trace }: { trace: Trace }) {
  const n = trace.steps.length;
  return (
    <Card>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.2, textWrap: "balance", whiteSpace: "pre-wrap" }}>
        {trace.title}
      </div>
      <div style={{ fontSize: 40, lineHeight: 1.35, color: LIGHT.muted }}>
        {n === 0 ? "No steps recorded" : `${n} ${n === 1 ? "step" : "steps"} recorded from a hash map written in Java`}
      </div>
    </Card>
  );
}

function EndCard({ page }: { page?: string }) {
  const lines = page ? [...SITE, `/${page}/`] : SITE;
  return (
    <Card>
      <div style={{ fontSize: 44, lineHeight: 1.35 }}>The article, code and tests, with this animation to step through:</div>
      <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.35, color: LIGHT.newStroke }}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </Card>
  );
}

type StepCardProps = {
  trace: Trace;
  index: number;
  /** What to draw: this step's scene, or the merge of it and the one before while moving. */
  scene: Scene;
  /** The step's own scene, which sets the drawing's size; defaults to `scene`. */
  size?: Scene;
  positions?: Positions;
};

/** One step: the drawing, its caption and the step counter. Exported for tests. */
export function StepCard({ trace, index, scene, size = scene, positions }: StepCardProps) {
  const width = size.width + 2 * DRAWING_PAD;
  const height = size.height + 2 * DRAWING_PAD;
  return (
    <AbsoluteFill style={{ padding: MARGIN, gap: GAP, color: LIGHT.text }}>
      <svg
        viewBox={`${-DRAWING_PAD} ${-DRAWING_PAD} ${width} ${height}`}
        style={{ flex: 1, minHeight: 0, width: "100%" }}
        fontFamily={LIGHT.font}
        fontSize={FONT_SIZE}
      >
        <HashTableDrawing scene={scene} palette={LIGHT} positions={positions} animate={false} />
      </svg>
      {/* Every caption in one grid cell, all but this step's hidden: the cell is as tall as the
          longest caption, so the drawing keeps one size for the whole video. */}
      <div style={{ display: "grid", fontSize: CAPTION_SIZE, lineHeight: CAPTION_LINE, overflowWrap: "anywhere" }}>
        {trace.steps.map((step, i) => (
          <div
            key={i}
            style={{ gridArea: "1 / 1", visibility: i === index ? "visible" : "hidden", whiteSpace: "pre-wrap" }}
          >
            {step.caption}
          </div>
        ))}
      </div>
      <div style={{ fontSize: COUNTER_SIZE, color: LIGHT.muted, textAlign: "right", marginTop: -GAP / 2 }}>
        {`Step ${index + 1} of ${trace.steps.length}`}
      </div>
    </AbsoluteFill>
  );
}

/**
 * A recorded trace as a square video: a title card, each step drawn by the site's own hash table
 * renderer with its caption burned in, then an end card naming the article. Every frame is a pure
 * function of the trace and the frame number.
 */
export function TraceVideo({ trace, page }: TraceVideoProps) {
  const frame = useCurrentFrame();
  const tl = useMemo(() => timeline(trace), [trace]);
  const scenes = useMemo(
    () =>
      layoutTrace(
        trace.steps.map((step) => slimState(step.state, trace.layout)),
        trace.layout,
      ),
    [trace],
  );
  const moment = at(tl, frame);

  let body: ReactNode;
  if (moment.kind === "title") body = <TitleCard trace={trace} />;
  else if (moment.kind === "end") body = <EndCard page={page} />;
  else {
    const to = scenes[moment.index]!;
    const from = moment.index > 0 ? scenes[moment.index - 1]! : to;
    const moving = moment.t < 1 && from !== to;
    const scene = moving ? mergeScenes(from, to) : to;
    const positions = moving ? positionsAt(from, to, smooth(moment.t)) : undefined;
    body = <StepCard trace={trace} index={moment.index} scene={scene} size={to} positions={positions} />;
  }

  return <AbsoluteFill style={{ backgroundColor: "#ffffff", fontFamily: SANS }}>{body}</AbsoluteFill>;
}
