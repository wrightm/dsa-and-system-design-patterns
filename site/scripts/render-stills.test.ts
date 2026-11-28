import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderStill } from "../lib/render/stills";
import { validateTrace } from "../lib/trace/validate";
import { FIXTURES, tempDir } from "../test/temp";
import { DEFAULTS, main } from "./render-stills";

const fixture = path.join(FIXTURES, "repo/data-structures/src/main/java/learn/ds/hashmap/animations/put.trace.json");
const animations = "data-structures/src/main/java/learn/ds/hashmap/animations";

function repoWithTrace(text = fs.readFileSync(fixture, "utf8")) {
  const repo = tempDir("stills-main");
  fs.mkdirSync(path.join(repo, animations), { recursive: true });
  fs.writeFileSync(path.join(repo, animations, "put.trace.json"), text);
  return repo;
}

function run(repoRoot: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = main({ repoRoot, log: (l) => out.push(l), error: (l) => err.push(l) });
  return { code, out, err };
}

describe("pnpm stills", () => {
  const svg = renderStill(validateTrace(JSON.parse(fs.readFileSync(fixture, "utf8")), "put"));
  const line = (status: string) => `${status} ${animations}/put.svg (${Buffer.byteLength(svg)} bytes)`;

  it("writes a missing still, leaves a fresh one alone and rewrites a stale one", () => {
    const repo = repoWithTrace();
    const still = path.join(repo, animations, "put.svg");
    expect(run(repo)).toEqual({ code: 0, out: [line("wrote    ")], err: [] });
    expect(fs.readFileSync(still, "utf8")).toBe(svg);

    const written = fs.statSync(still).mtimeMs;
    fs.utimesSync(still, new Date(0), new Date(0));
    expect(run(repo)).toEqual({ code: 0, out: [line("unchanged")], err: [] });
    expect(fs.statSync(still).mtimeMs).toBe(0);
    expect(written).toBeGreaterThan(0);

    fs.writeFileSync(still, "stale");
    expect(run(repo)).toEqual({ code: 0, out: [line("updated  ")], err: [] });
    expect(fs.readFileSync(still, "utf8")).toBe(svg);
  });

  it("names the trace, relative to the repository, when it is invalid, and exits 1", () => {
    const repo = repoWithTrace(JSON.stringify({ version: 2 }));
    expect(run(repo)).toEqual({ code: 1, out: [], err: [`${animations}/put.trace.json: version must be 1, found 2`] });
    expect(fs.existsSync(path.join(repo, animations, "put.svg"))).toBe(false);
  });

  it("defaults to the repository around this site and the console", () => {
    expect(DEFAULTS).toEqual({
      repoRoot: path.resolve(import.meta.dirname, "..", ".."),
      log: console.log,
      error: console.error,
    });
  });
});
