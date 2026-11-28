import fs from "node:fs";
import path from "node:path";
import { slimState } from "../lib/render/hash-table/layout";
import { BASE_PATH } from "../lib/site";
import type { Trace } from "../lib/trace/types";
import { validateTrace } from "../lib/trace/validate";
import { type AnimationStep, HashTablePlayer } from "./HashTablePlayer";
import { CONTEXT_LINES, type Excerpt } from "./SourceExcerpt";

const ID = /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;
const NOSCRIPT_RULE = "[data-animation-player]{display:none}";

/**
 * Renderers by trace kind. A kind with none fails the type check rather than drawing nothing, and
 * `validateTrace` rejects any kind not in `Trace["kind"]`.
 */
const RENDERERS: Record<Trace["kind"], typeof HashTablePlayer> = { "hash-table": HashTablePlayer };

/** The validated trace for an animation id, from `<content>/traces`. Errors name the file. */
export function loadTrace(id: string, content: string): Trace {
  const shown = `content/traces/${id}.json`;
  if (!ID.test(id)) throw new Error(`Animation: id must be <module>/<slug>/<name>, found ${JSON.stringify(id)}`);
  const file = path.join(content, "traces", `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`${shown}: no trace for animation ${id}`);
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${shown}: not valid JSON (${(error as Error).message})`);
  }
  return validateTrace(json, shown);
}

/** The excerpt for every line the trace names, keyed `<file>:<line>`. Throws on a line past the end. */
export function excerptsOf(trace: Trace, id: string, content: string): Record<string, Excerpt> {
  const shown = `content/traces/${id}.json`;
  const files = new Map<string, string[]>();
  const excerpts: Record<string, Excerpt> = {};
  for (const step of trace.steps) {
    if (step.source === null) continue;
    const { file, line } = step.source;
    const key = `${file}:${line}`;
    if (key in excerpts) continue;
    if (!files.has(file)) {
      const from = path.join(content, "sources", path.dirname(id), file);
      if (!fs.existsSync(from)) throw new Error(`${shown}: source file not found: ${file}`);
      files.set(file, fs.readFileSync(from, "utf8").replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n"));
    }
    const lines = files.get(file)!;
    if (line < 1 || line > lines.length) {
      throw new Error(`${shown}: line ${line} is outside ${file}, which has ${lines.length} lines`);
    }
    const start = Math.max(1, line - CONTEXT_LINES);
    excerpts[key] = { file, line, start, lines: lines.slice(start - 1, Math.min(lines.length, line + CONTEXT_LINES)) };
  }
  return excerpts;
}

/**
 * A recorded trace as an interactive player. Runs on the server at build time: it validates the
 * trace and ships the browser only what the renderer draws. Without JavaScript the still shows.
 */
export function Animation({ id, alt }: { id: string; alt: string }) {
  // `pnpm collect` writes content/ inside the site, where Next.js builds from.
  const content = path.resolve("content");
  const trace = loadTrace(id, content);
  const excerpts = excerptsOf(trace, id, content);
  const steps: AnimationStep[] = trace.steps.map((step) => ({
    caption: step.caption,
    excerpt: step.source === null ? null : `${step.source.file}:${step.source.line}`,
    state: slimState(step.state, trace.layout),
  }));
  const Renderer = RENDERERS[trace.kind];
  // Without JavaScript the player cannot step, so the noscript rule hides it and the still shows
  // alone. With JavaScript the browser never parses the noscript, so only the player shows.
  return (
    <>
      <div data-animation-player="">
        <Renderer title={trace.title} layout={trace.layout} alt={alt} steps={steps} excerpts={excerpts} />
      </div>
      <noscript>
        <style>{NOSCRIPT_RULE}</style>
        <img src={`${BASE_PATH}/generated/animations/${id}.svg`} alt={alt} className="my-6" />
      </noscript>
    </>
  );
}
