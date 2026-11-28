import { defineConfig } from "vitest/config";

// Component tests opt in to jsdom with `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({
  test: {
    include: [
      "{app,components,lib,remotion,scripts}/**/*.test.{ts,tsx}",
      "mdx-components.test.tsx",
      "source.config.test.ts",
    ],
    exclude: ["e2e/**", "node_modules/**"],
    // Fumadocs' layouts import `next/navigation` with no extension, which only a bundler resolves
    // (Next has no exports map), so Vite transforms them rather than Node loading them.
    server: { deps: { inline: ["fumadocs-ui", "fumadocs-core"] } },
    coverage: {
      provider: "v8",
      // Every source file is measured whether or not a test imports it, so a new untested file
      // fails the thresholds below.
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "remotion/**/*.{ts,tsx}",
        "scripts/**/*.{ts,tsx}",
        "mdx-components.tsx",
        "source.config.ts",
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
