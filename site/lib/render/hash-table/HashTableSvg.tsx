"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { type Scene, type SceneItem, heatLevel } from "./layout";
import type { Palette } from "./palette";

export type Positions = Record<string, { x: number; y: number; opacity: number }>;

type Props = {
  scene: Scene;
  palette: Palette;
  /** Draw each item here, with no Motion at all (Remotion frames and stills). */
  positions?: Positions;
  /** Tween items between scenes by id. False cuts straight to the new scene. */
  animate: boolean;
  /** Accessible name for the drawing. */
  label?: string;
};

const PAD = 8;
const FONT_SIZE = 13;
const TWEEN = { duration: 0.45, ease: "easeInOut" } as const;

function stroke(item: SceneItem, palette: Palette, normal: string) {
  if (item.emphasis === "focus") return { stroke: palette.focus, strokeWidth: 2.5, strokeDasharray: "5 3" };
  if (item.emphasis === "new") return { stroke: palette.newStroke, strokeWidth: 3 };
  return { stroke: normal, strokeWidth: 1 };
}

function Text({ item, palette, bold = false }: { item: SceneItem; palette: Palette; bold?: boolean }) {
  return (
    <text
      x={item.w / 2}
      y={item.h / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fill={palette.text}
      fontWeight={bold ? 700 : 400}
      style={{ whiteSpace: "pre" }}
    >
      {item.text}
    </text>
  );
}

/** One item drawn at the origin; the caller places it. */
function Shape({ item, palette }: { item: SceneItem; palette: Palette }): ReactNode {
  switch (item.kind) {
    case "bucket":
      if (item.count !== undefined) {
        return (
          <rect
            width={item.w}
            height={item.h}
            fill={palette.heat[heatLevel(item.count)]}
            {...stroke(item, palette, palette.bucketStroke)}
            strokeWidth={item.emphasis === "focus" ? 2.5 : 0.5}
          />
        );
      }
      return (
        <>
          <rect
            width={item.w}
            height={item.h}
            rx={4}
            fill={palette.bucketFill}
            {...stroke(item, palette, palette.bucketStroke)}
          />
          <text x={item.w / 2} y={item.h / 2} textAnchor="middle" dominantBaseline="central" fill={palette.muted}>
            {item.text}
          </text>
        </>
      );
    case "node":
      return (
        <>
          <rect
            width={item.w}
            height={item.h}
            rx={6}
            fill={item.emphasis === "new" ? palette.newFill : palette.nodeFill}
            {...stroke(item, palette, palette.nodeStroke)}
          />
          <Text item={item} palette={palette} bold={item.emphasis === "new"} />
        </>
      );
    case "pipeline":
      return (
        <>
          <rect
            width={item.w}
            height={item.h}
            rx={4}
            fill={palette.pipelineFill}
            {...stroke(item, palette, palette.pipelineStroke)}
          />
          <Text item={item} palette={palette} />
        </>
      );
    case "link": {
      const mid = item.h / 2;
      return (
        <>
          <line x1={2} y1={mid} x2={item.w - 6} y2={mid} stroke={palette.link} strokeWidth={1.5} />
          <path d={`M ${item.w - 1} ${mid} l -6 -4 v 8 z`} fill={palette.link} />
        </>
      );
    }
    case "label":
      if (item.count !== undefined) {
        return (
          <>
            <rect
              y={(item.h - 12) / 2}
              width={12}
              height={12}
              rx={2}
              fill={palette.heat[heatLevel(item.count)]}
              stroke={palette.bucketStroke}
              strokeWidth={0.5}
            />
            <text x={18} y={item.h / 2} dominantBaseline="central" fill={palette.muted} fontSize={12}>
              {item.text}
            </text>
          </>
        );
      }
      return (
        <text
          x={item.w / 2}
          y={item.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={palette.muted}
          fontSize={12}
        >
          {item.text}
        </text>
      );
  }
}

const isCell = (item: SceneItem) => item.kind === "bucket" && item.count !== undefined;

/**
 * The grid's cells as one path per colour band, so a 1024-bucket table is a few elements rather
 * than a thousand. Cells never move between grid scenes; only their colour cuts to the new band.
 * A focused or fading cell is left for the caller to draw on its own.
 */
function Cells({ items, palette, positions }: { items: SceneItem[]; palette: Palette; positions?: Positions }) {
  const paths: string[][] = palette.heat.map(() => []);
  for (const item of items) {
    const at = positions?.[item.id] ?? item;
    paths[heatLevel(item.count!)]!.push(`M${at.x} ${at.y}h${item.w}v${item.h}h${-item.w}z`);
  }
  return paths.map((d, level) =>
    d.length === 0 ? null : (
      <path
        key={`cells:${level}`}
        d={d.join("")}
        fill={palette.heat[level]}
        stroke={palette.bucketStroke}
        strokeWidth={0.5}
      />
    ),
  );
}

/** A scene drawn in SVG. It scales down to fit its container and never past its own size. */
export function HashTableSvg({ scene, palette, positions, animate, label }: Props) {
  const width = scene.width + 2 * PAD;
  const height = scene.height + 2 * PAD;
  const tweened = animate && positions === undefined;
  const plainCell = (item: SceneItem) =>
    isCell(item) && item.emphasis !== "focus" && (positions?.[item.id]?.opacity ?? 1) === 1;
  const cells = scene.items.filter(plainCell);
  const rest = scene.items.filter((item) => !plainCell(item));
  // Grid cells never move, so they stay plain elements even when animating.
  const fixed = (item: SceneItem) => !tweened || isCell(item);

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, height: "auto", display: "block", margin: "0 auto" }}
      role="img"
      aria-label={label}
      fontFamily={palette.font}
      fontSize={FONT_SIZE}
    >
      <Cells items={cells} palette={palette} positions={positions} />
      {rest.filter(fixed).map((item) => {
        const at = positions?.[item.id] ?? { x: item.x, y: item.y, opacity: 1 };
        return (
          <g
            key={item.id}
            transform={`translate(${at.x} ${at.y})`}
            opacity={at.opacity === 1 ? undefined : at.opacity}
          >
            <Shape item={item} palette={palette} />
          </g>
        );
      })}
      {tweened ? (
        <AnimatePresence initial={false}>
          {rest
            .filter((item) => !fixed(item))
            .map((item) => (
              <motion.g
                key={item.id}
                initial={{ opacity: 0, x: item.x, y: item.y }}
                animate={{ opacity: 1, x: item.x, y: item.y }}
                exit={{ opacity: 0 }}
                transition={TWEEN}
              >
                <Shape item={item} palette={palette} />
              </motion.g>
            ))}
        </AnimatePresence>
      ) : null}
    </svg>
  );
}
