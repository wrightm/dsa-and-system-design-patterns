import { afterEach, describe, expect, it, vi } from "vitest";

// The base path is read once, when the module loads, so each test loads it afresh.
async function site(basePath?: string) {
  vi.resetModules();
  if (basePath === undefined) vi.stubEnv("NEXT_PUBLIC_BASE_PATH", undefined);
  else vi.stubEnv("NEXT_PUBLIC_BASE_PATH", basePath);
  return import("./site");
}

afterEach(() => vi.unstubAllEnvs());

describe("site", () => {
  it("names the site", async () => {
    expect((await site()).SITE_NAME).toBe("DSA and system design patterns in Java");
  });

  it("puts the site under the base path the build sets", async () => {
    const { BASE_PATH, SITE_URL } = await site("/dsa-and-system-design-patterns");
    expect(BASE_PATH).toBe("/dsa-and-system-design-patterns");
    expect(SITE_URL).toBe("https://wrightm.github.io/dsa-and-system-design-patterns");
  });

  it("serves from the root when no base path is set", async () => {
    const { BASE_PATH, SITE_URL } = await site();
    expect(BASE_PATH).toBe("");
    expect(SITE_URL).toBe("https://wrightm.github.io");
  });
});
