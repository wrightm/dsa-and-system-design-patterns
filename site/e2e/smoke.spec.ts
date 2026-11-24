import { expect, test } from "@playwright/test";

// Relative to the base URL in playwright.config.ts, so every path sits under the base path.
const urls = [
  "",
  "series/",
  "about/",
  "catalogue/",
  "catalogue/data-structures/",
  "data-structures/",
  "data-structures/hashmap/",
];

for (const url of urls) {
  test(`/${url} returns 200`, async ({ request }) => {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });
}

test("the hash map article renders", async ({ page }) => {
  await page.goto("data-structures/hashmap/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("Hash map");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\/data-structures\/hashmap\//);
  await expect(page.locator("article svg[id^='mermaid']").first()).toBeVisible();
  await expect(page.locator('a[href^="https://github.com/"][href$="ChainedHashMap.java"]').first()).toBeAttached();
});

test("links between pages resolve to trailing-slash URLs under the base path", async ({ page }) => {
  await page.goto("series/");
  const link = page.locator("article a", { hasText: "Hash map" }).first();
  await expect(link).toHaveAttribute("href", "/dsa-and-system-design-patterns/data-structures/hashmap/");
});

test("search finds the hash map article", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: /search/i }).first().click();
  await page.getByRole("dialog").getByRole("combobox").fill("hash map");
  await expect(page.getByRole("dialog").getByText(/Hash map: from a list of pairs/).first()).toBeVisible();
});
