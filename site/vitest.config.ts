import { defineConfig } from "vitest/config";

// Component tests opt in to jsdom with `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "components/**/*.test.tsx", "remotion/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
