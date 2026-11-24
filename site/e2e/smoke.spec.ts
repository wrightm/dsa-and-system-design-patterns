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

test("the first player's Forward button changes its caption", async ({ page }) => {
  await page.goto("data-structures/hashmap/");
  const player = page.locator("figure[aria-label^='Animation:']").first();
  const caption = player.locator("[aria-live]");
  const before = await caption.textContent();
  await player.getByRole("button", { name: "Forward" }).click();
  await expect(caption).not.toHaveText(before ?? "");
});

test("the hash map page logs no console errors on load or while stepping", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("data-structures/hashmap/");
  const players = page.locator("figure[aria-label^='Animation:']");
  await expect(players).toHaveCount(3);
  for (const player of await players.all()) {
    await player.getByRole("button", { name: "Forward" }).click();
    await expect(player.getByText("step 2 of")).toBeVisible();
    await player.getByRole("button", { name: "Last" }).click();
  }
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("steps cut without tweening and Play still advances", async ({ page }) => {
    await page.goto("data-structures/hashmap/");
    const player = page.locator("figure[aria-label^='Animation:']").first();
    await player.getByRole("button", { name: "Forward" }).click();
    await expect(player.getByText("step 2 of")).toBeVisible();
    // Only the player's own: clicking scrolls the page, and the Fumadocs contents list transitions.
    const running = await player.evaluate(
      (figure) =>
        document.getAnimations().filter((a) => figure.contains((a.effect as KeyframeEffect | null)?.target ?? null))
          .length,
    );
    expect(running).toBe(0);
    await player.getByRole("button", { name: "Play" }).click();
    await expect(player.getByText("step 3 of")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("each animation shows its still and no player", async ({ page }) => {
    await page.goto("data-structures/hashmap/");
    const stills = page.locator("img[src*='/generated/animations/data-structures/hashmap/']");
    await expect(stills).toHaveCount(3);
    for (const still of await stills.all()) {
      await expect(still).toBeVisible();
      expect(await still.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    // The server-rendered players are still in the page, but hidden: their controls cannot work.
    const players = page.locator("figure[aria-label^='Animation:']");
    await expect(players).toHaveCount(3);
    for (const player of await players.all()) await expect(player).toBeHidden();
    await expect(page.getByRole("button", { name: "Forward" })).toHaveCount(0);
  });
});
