import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIGHT, type Palette, THEMED } from "./palette";

const css = fs.readFileSync(path.resolve(import.meta.dirname, "../../../app/global.css"), "utf8");

/** The `--ht-*` variables a CSS block sets, from its selector to its closing brace. */
function variables(selector: string): Map<string, string> {
  const blocks = [...css.matchAll(/^(\S[^{\n]*)\{([^}]*)\}/gm)].filter((m) => m[1]!.trim() === selector);
  const found = new Map<string, string>();
  for (const block of blocks) {
    for (const [, name, value] of block[2]!.matchAll(/(--ht-[a-z0-9-]+):\s*([^;]+);/g)) found.set(name!, value!);
  }
  return found;
}

/** Each colour of a palette by its CSS variable name, `bucketFill` as `--ht-bucket-fill`. */
function byVariable(palette: Palette): [string, string][] {
  const { font: _, heat, ...colours } = palette;
  return [
    ...Object.entries(colours).map(([key, value]): [string, string] => [
      `--ht-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
    ...heat.map((value, i): [string, string] => [`--ht-heat-${i}`, value]),
  ];
}

describe("THEMED", () => {
  it("draws each colour from its own CSS variable", () => {
    for (const [name, value] of byVariable(THEMED)) expect(value).toBe(`var(${name})`);
  });

  it("names only variables the light and dark themes both set", () => {
    const names = byVariable(THEMED).map(([name]) => name);
    expect([...variables(":root").keys()]).toEqual(names);
    expect([...variables(".dark").keys()]).toEqual(names);
  });

  it("matches the stills' colours in the light theme", () => {
    expect([...variables(":root")]).toEqual(byVariable(LIGHT));
  });

  it("uses the same font as the stills", () => {
    expect(THEMED.font).toBe(LIGHT.font);
  });
});
