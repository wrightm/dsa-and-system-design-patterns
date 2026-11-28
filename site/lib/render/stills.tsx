import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Trace } from "../trace/types";
import { FONT_SIZE, HashTableDrawing } from "./hash-table/HashTableSvg";
import { type Scene, layoutTrace, slimState } from "./hash-table/layout";
import { LIGHT } from "./hash-table/palette";

const MARGIN = 16;
const MIN_WIDTH = 320;
const TITLE_SIZE = 15;
const CAPTION_SIZE = 13;
const NOTE_SIZE = 11;
const LINE_GAP = 1.4;
const CHAR_EM = 0.6; // a monospace character is about 0.6 of its font size wide
const BACKGROUND = "#ffffff";
const NOTE = "Interactive version on the site";

/** Words cut into lines of at most `max` characters; a word longer than a line is split. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.match(/\S+/g) ?? []) {
    let rest = Array.from(word);
    // Stryker disable next-line EqualityOperator: a word exactly a line long ends up alone on its line either way.
    while (rest.length > max) {
      if (line) lines.push(line);
      lines.push(rest.slice(0, max).join(""));
      line = "";
      rest = rest.slice(max);
    }
    const piece = rest.join("");
    if (!line) line = piece;
    else if (Array.from(line).length + 1 + rest.length <= max) line = `${line} ${piece}`;
    else {
      lines.push(line);
      line = piece;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type Block = { lines: string[]; size: number; weight: number; colour: string };

function blockHeight(block: Block): number {
  return block.lines.length * block.size * LINE_GAP;
}

function TextBlock({ block, y }: { block: Block; y: number }) {
  return (
    <text y={y} fontSize={block.size} fontWeight={block.weight} fill={block.colour}>
      {block.lines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? block.size : block.size * LINE_GAP}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * A complete standalone SVG document of a trace's last step: an opaque white background (so it
 * reads on GitHub's dark theme too), the title, the drawing, the step's caption, and a note that
 * the site has the interactive version. Fixed light colours, no Motion, no ids: the same trace
 * always gives the same bytes. A trace with no steps gives the frame with its title alone.
 */
export function renderStill(trace: Trace): string {
  const last = trace.steps.at(-1);
  const scene: Scene | null = last
    ? layoutTrace(
        trace.steps.map((s) => slimState(s.state, trace.layout)),
        trace.layout,
      ).at(-1)!
    : null;
  // The player keeps room for the key pipeline on every step; a still without one needs none.
  // A scene always has its stats labels, so it is never empty.
  const top = scene ? Math.min(...scene.items.map((item) => item.y)) : 0;
  const inner = Math.max(MIN_WIDTH, scene?.width ?? 0);
  const fits = (size: number) => Math.floor(inner / (size * CHAR_EM));

  const title: Block = { lines: wrap(trace.title, fits(TITLE_SIZE)), size: TITLE_SIZE, weight: 700, colour: LIGHT.text };
  const caption: Block = {
    lines: last ? wrap(last.caption, fits(CAPTION_SIZE)) : [],
    size: CAPTION_SIZE,
    weight: 400,
    colour: LIGHT.text,
  };
  const note: Block = { lines: [NOTE], size: NOTE_SIZE, weight: 400, colour: LIGHT.muted };

  let y = 0;
  const titleY = y;
  y += blockHeight(title) + 12;
  const sceneY = y;
  if (scene) y += scene.height - top + 14;
  const captionY = y;
  if (caption.lines.length > 0) y += blockHeight(caption) + 10;
  const noteY = y;
  y += blockHeight(note);

  const width = inner + 2 * MARGIN;
  const height = Math.ceil(y + 2 * MARGIN);
  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={trace.title}
      fontFamily={LIGHT.font}
      fontSize={FONT_SIZE}
    >
      <title>{trace.title}</title>
      <rect width={width} height={height} fill={BACKGROUND} />
      <g transform={`translate(${MARGIN} ${MARGIN})`}>
        <TextBlock block={title} y={titleY} />
        {scene ? (
          <g transform={`translate(0 ${sceneY - top})`}>
            <HashTableDrawing scene={scene} palette={LIGHT} animate={false} />
          </g>
        ) : null}
        {caption.lines.length > 0 ? <TextBlock block={caption} y={captionY} /> : null}
        <TextBlock block={note} y={noteY} />
      </g>
    </svg>
  );
  return `${renderToStaticMarkup(svg)}\n`;
}

const SKIP = new Set(["site", "node_modules", "build"]);

/** Every `*.trace.json` in the topic modules, sorted. Skips `site/`, build output and dot-directories. */
export function findTraces(repoRoot: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) walk(full);
      } else if (entry.name.endsWith(".trace.json")) {
        found.push(full);
      }
    }
  };
  walk(repoRoot);
  return found.sort();
}

/** `<name>.svg` beside `<name>.trace.json`. */
export function stillPathOf(traceFile: string): string {
  return traceFile.replace(/\.trace\.json$/, ".svg");
}
