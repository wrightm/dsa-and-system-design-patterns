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

test("an invalid Mermaid diagram falls back to its source and leaves the page intact", async ({ page }) => {
  // Break the diagram in the served HTML (both the markup and the embedded React data), so no
  // broken fixture page ever ships in the site.
  await page.route("**/data-structures/hashmap/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll("flowchart LR", "notadiagram LR");
    await route.fulfill({ response, body });
  });
  await page.goto("data-structures/hashmap/");
  // data-mermaid="failed" is only set in the browser, after Mermaid has tried and failed.
  await expect(page.locator('pre.mermaid-source[data-mermaid="failed"]')).toContainText("notadiagram LR");
  await expect(page.locator("h1")).toContainText("Hash map");
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
  await expect(page.getByText("Syntax error in text")).toHaveCount(0);
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

// The hash map article gains its animation images in Task 7. Until then the page has no player,
// so these stay `fixme`; Task 7 turns them on.
test.fixme("the first player's Forward button changes its caption", async ({ page }) => {
  await page.goto("data-structures/hashmap/");
  const player = page.locator("figure[aria-label^='Animation:']").first();
  const caption = player.locator("[aria-live]");
  const before = await caption.textContent();
  await player.getByRole("button", { name: "Forward" }).click();
  await expect(caption).not.toHaveText(before ?? "");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.fixme("steps cut without tweening and Play still advances", async ({ page }) => {
    await page.goto("data-structures/hashmap/");
    const player = page.locator("figure[aria-label^='Animation:']").first();
    await player.getByRole("button", { name: "Forward" }).click();
    await expect(player.getByText("step 2 of")).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await player.getByRole("button", { name: "Play" }).click();
    await expect(player.getByText("step 3 of")).toBeVisible({ timeout: 5000 });
  });
});
