import path from "node:path";
import { defineConfig } from "vitest/config";

// Component tests opt in to jsdom with `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({
  resolve: {
    // fumadocs-mdx generates .source/ from the collected content; tests use a known collection.
    alias: [{ find: /^(\.\.\/)+\.source\/server$/, replacement: path.resolve(import.meta.dirname, "test/docs.ts") }],
  },
  test: {
    include: [
      "{app,components,lib,remotion,scripts}/**/*.test.{ts,tsx}",
      "mdx-components.test.tsx",
      "source.config.test.ts",
      "stryker.ignorers.test.ts",
      "test-gates.test.ts",
    ],
    exclude: ["e2e/**", "node_modules/**"],
    // Fumadocs' layouts import `next/navigation` with no extension, which only a bundler resolves
    // (Next has no exports map), so Vite transforms them rather than Node loading them.
    server: { deps: { inline: ["fumadocs-ui", "fumadocs-core"] } },
    coverage: {
      provider: "v8",
      // Every source file is measured whether or not a test imports it, so a new untested file
      // fails the thresholds below. test-gates.test.ts fails on any source file these globs miss
      // and its list does not explain.
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "remotion/**/*.{ts,tsx}",
        "scripts/**/*.{ts,tsx}",
        "mdx-components.tsx",
        "source.config.ts",
        "stryker.ignorers.mjs",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        // Remotion's bundle entry: it only calls registerRoot, which needs Remotion's bundler.
        // `pnpm video` bundles and runs it; Root, which it registers, is tested.
        "remotion/index.ts",
      ],
      reporter: ["text-summary", "text", "html"],
      reportsDirectory: "reports/coverage",
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
