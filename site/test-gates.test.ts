import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import stryker from "./stryker.config.mjs";
import vitest from "./vitest.config";

// The coverage and mutation gates only see the files their globs name. A source file in a new
// folder, or with an extension the globs leave out, would escape both without failing anything,
// so this walks the site and fails, naming the file, on any source file neither gate sees.

const SITE = import.meta.dirname;
const SOURCE = /\.(?:ts|tsx|js|mjs|jsx)$/;

/** Folders that hold no hand-written source: dependencies, build output, generated files, tests. */
const SKIPPED_FOLDERS = new Set([
  "node_modules",
  ".next",
  "out",
  ".source",
  "content",
  "coverage",
  "reports",
  ".stryker-tmp",
  "test",
  "e2e",
  "public",
  // Also generated or untracked: Playwright's output, the trace copies and a Python environment.
  "test-results",
  "playwright-report",
  ".generated",
  ".venv",
]);

/** Tool configuration at the site root, read by the tools themselves rather than run by tests. */
const CONFIG_FILES = new Set([
  "next-env.d.ts",
  "next.config.mjs",
  "playwright.config.ts",
  "postcss.config.mjs",
  "stryker.config.mjs",
  "vitest.config.ts",
]);

/** Source files coverage leaves out on purpose, each with its reason. */
const NOT_COVERED: Record<string, string> = {
  "remotion/index.ts": "Remotion's bundle entry: it only calls registerRoot, which needs Remotion's bundler; `pnpm video` runs it",
};

/** Source files mutation testing leaves out on purpose, each with its reason. */
const NOT_MUTATED: Record<string, string> = {
  "remotion/index.ts": "Remotion's bundle entry, not covered by unit tests for the same reason",
  "stryker.ignorers.mjs":
    "Stryker's own plugin, loaded by the Stryker process from the unmutated file; its rule is covered by stryker.ignorers.test.ts",
};

/** Every source file under `dir`, relative to the site, skipping tests and the folders above. */
function sourceFiles(dir = SITE): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(SITE, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDERS.has(entry.name)) found.push(...sourceFiles(full));
    } else if (SOURCE.test(entry.name) && !/\.test\.[^.]+$/.test(entry.name) && !CONFIG_FILES.has(relative)) {
      found.push(relative);
    }
  }
  return found.sort();
}

/** A glob as the gates write them (`**`, `*` and `{a,b}`) as a regular expression. */
function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (glob.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
    } else if (c === "*") source += "[^/]*";
    else if (c === "{") source += "(?:";
    else if (c === "}") source += ")";
    else if (c === ",") source += "|";
    else source += c.replace(/[.+?^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

const matchesAny = (file: string, globs: string[]) => globs.some((glob) => globToRegExp(glob).test(file));

const coverage = vitest.test!.coverage as { include: string[]; exclude: string[] };
const isCovered = (file: string) => matchesAny(file, coverage.include) && !matchesAny(file, coverage.exclude);

const mutate = stryker.mutate as string[];
const isMutated = (file: string) =>
  matchesAny(file, mutate.filter((glob) => !glob.startsWith("!"))) &&
  !matchesAny(file, mutate.filter((glob) => glob.startsWith("!")).map((glob) => glob.slice(1)));

describe("globToRegExp", () => {
  it.each([
    ["app/**/*.{ts,tsx}", "app/page.tsx", true],
    ["app/**/*.{ts,tsx}", "app/a/b/page.ts", true],
    ["app/**/*.{ts,tsx}", "app/page.js", false],
    ["app/**/*.{ts,tsx}", "apps/page.ts", false],
    ["**/*.test.{ts,tsx}", "a.test.ts", true],
    ["mdx-components.tsx", "mdx-components.tsx", true],
    ["mdx-components.tsx", "mdx-componentsXtsx", false],
  ])("%s matches %s: %s", (glob, file, matches) => {
    expect(globToRegExp(glob).test(file)).toBe(matches);
  });
});

describe("the test gates", () => {
  const files = sourceFiles();

  it("find the site's source files", () => {
    expect(files).toContain("components/Mermaid.tsx");
    expect(files).toContain("stryker.ignorers.mjs");
    expect(files).not.toContain("vitest.config.ts");
  });

  it("measure the coverage of every source file, unless it is left out with a reason", () => {
    expect(files.filter((file) => !isCovered(file) && !(file in NOT_COVERED))).toEqual([]);
  });

  it("mutate every source file, unless it is left out with a reason", () => {
    expect(files.filter((file) => !isMutated(file) && !(file in NOT_MUTATED))).toEqual([]);
  });

  it("leave out only files that exist and that the gate would otherwise miss", () => {
    expect(Object.keys(NOT_COVERED).filter((file) => !files.includes(file) || isCovered(file))).toEqual([]);
    expect(Object.keys(NOT_MUTATED).filter((file) => !files.includes(file) || isMutated(file))).toEqual([]);
  });
});
