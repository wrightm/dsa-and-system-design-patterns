"use client";

import { useMemo } from "react";
import { HashTableSvg } from "../lib/render/hash-table/HashTableSvg";
import { type Layout, type LayoutState, type Scene, layoutTrace } from "../lib/render/hash-table/layout";
import { THEMED } from "../lib/render/hash-table/palette";
import { Player } from "./Player";
import { type Excerpt, SourceExcerpt } from "./SourceExcerpt";

/** A trace step slimmed on the server to what the browser draws. */
export type AnimationStep = {
  caption: string;
  /** Key into `excerpts`, or null when the step names no line of code. */
  excerpt: string | null;
  state: LayoutState;
};

export type HashTablePlayerProps = {
  title: string;
  layout: Layout;
  /** The image's alt text, used as the drawing's accessible name. */
  alt: string;
  steps: AnimationStep[];
  excerpts: Record<string, Excerpt>;
};

/** The client half of `Animation`: lays out every step once and plays them. */
export function HashTablePlayer({ title, layout, alt, steps, excerpts }: HashTablePlayerProps) {
  const scenes = useMemo(() => {
    const laid = layoutTrace(
      steps.map((s) => s.state),
      layout,
    );
    return new Map<AnimationStep, Scene>(steps.map((step, i) => [step, laid[i]!]));
  }, [steps, layout]);
  const hasSource = steps.some((s) => s.excerpt !== null);

  return (
    <Player
      trace={{ title, steps }}
      renderStep={(step, _previous, reducedMotion) => (
        <HashTableSvg scene={scenes.get(step)!} palette={THEMED} animate={!reducedMotion} label={alt} />
      )}
      footer={
        hasSource
          ? (step) => <SourceExcerpt excerpt={step.excerpt === null ? null : (excerpts[step.excerpt] ?? null)} />
          : undefined
      }
    />
  );
}
