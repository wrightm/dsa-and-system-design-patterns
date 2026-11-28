// Mutation testing: Stryker changes the source one small way at a time (a flipped condition, an
// emptied string, a removed call) and runs the tests that cover that line. A change the tests
// still pass is a surviving mutant: behaviour nothing checks. `pnpm mutation` fails on any.
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  // Named explicitly: Stryker's plugin discovery does not find it under pnpm's layout.
  plugins: ["@stryker-mutator/vitest-runner", "./stryker.ignorers.mjs"],
  // Leaves Tailwind class strings out. See stryker.ignorers.mjs.
  ignorers: ["class-names"],
  // test-gates.test.ts fails on any source file these globs miss and its list does not explain.
  mutate: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "remotion/**/*.{ts,tsx}",
    "scripts/**/*.{ts,tsx}",
    "mdx-components.tsx",
    "source.config.ts",
    "!**/*.test.{ts,tsx}",
    // Remotion's bundle entry, excluded from coverage for the same reason: only `pnpm video` runs it.
    "!remotion/index.ts",
  ],
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  clearTextReporter: { allowColor: false, logTests: false },
  coverageAnalysis: "perTest",
  // Every mutant must be killed.
  thresholds: { high: 100, low: 100, break: 100 },
  // `pnpm mutation` reruns only mutants whose code or tests changed since the last run. That is for
  // quick iteration only: it can reuse a stale result (say, when a helper the mutated code calls
  // changes) and be wrong either way. `pnpm verify` runs `pnpm mutation:full`, which forces every
  // mutant, and CI starts without the git-ignored state file, so both run everything.
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  // TypeScript 7 has no JavaScript API, so Stryker's TypeScript checker cannot load it and the
  // tsconfig is not read. `pnpm typecheck` covers types; a mutant that does not type-check still
  // has to be killed by a test.
  tsconfigFile: "",
  tempDirName: ".stryker-tmp",
  // Anchored to the site folder, so nested folders of the same name are still copied.
  ignorePatterns: [
    "/.venv",
    "/.generated",
    "/.next",
    "/.source",
    "/out",
    "/test-results",
    "/playwright-report",
    "/reports",
    "/public/generated",
    "/content",
  ],
};
