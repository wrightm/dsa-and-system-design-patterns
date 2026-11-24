import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}/dsa-and-system-design-patterns/` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm serve",
    url: `http://localhost:${port}/dsa-and-system-design-patterns/`,
    reuseExistingServer: !process.env.CI,
  },
});
