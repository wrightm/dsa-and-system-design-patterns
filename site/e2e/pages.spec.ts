import fs from "node:fs";
import path from "node:path";
import { type Page, expect, test } from "@playwright/test";

// One smoke test per page the build exported: every `index.html` under out/ is a page, so a new
// article, domain or catalogue page is covered the moment it is built.
const OUT = path.resolve(import.meta.dirname, "..", "out");
const BASE = "/dsa-and-system-design-patterns";

function pagesIn(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...pagesIn(full));
    else if (entry.name === "index.html") found.push(full);
  }
  return found;
}

/** `out/a/b/index.html` is served at `/dsa-and-system-design-patterns/a/b/`. */
function urlOf(file: string): string {
  const folder = path.relative(OUT, path.dirname(file)).split(path.sep).join("/");
  return folder === "" ? `${BASE}/` : `${BASE}/${folder}/`;
}

const PAGES = fs.existsSync(OUT) ? pagesIn(OUT).map(urlOf).sort() : [];

/** The file in out/ a same-origin path names, as the server resolves it, or null. */
function fileFor(pathname: string): string | null {
  if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) return null;
  const file = path.join(OUT, decodeURIComponent(pathname.slice(BASE.length)));
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const index = path.join(file, "index.html");
  return fs.existsSync(index) ? index : null;
}

const idsByFile = new Map<string, Set<string>>();
/** Every `id` attribute in a built HTML file, as the browser would decode it. */
function idsIn(file: string): Set<string> {
  let ids = idsByFile.get(file);
  if (!ids) {
    const html = fs.readFileSync(file, "utf8");
    ids = new Set(Array.from(html.matchAll(/\sid="([^"]*)"/g), (m) => decodeEntities(m[1]!)));
    idsByFile.set(file, ids);
  }
  return ids;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The `src` of every animation still a built page carries for readers without JavaScript. */
function stillsIn(file: string): string[] {
  const html = fs.readFileSync(file, "utf8");
  return Array.from(html.matchAll(/<noscript>(.*?)<\/noscript>/gs), (m) => m[1]!).flatMap((noscript) =>
    Array.from(noscript.matchAll(/<img[^>]*\ssrc="([^"]*\/animations\/[^"]*)"/g), (m) => decodeEntities(m[1]!)),
  );
}

/** Waits for every image to finish loading, including any the browser would have loaded lazily. */
async function settleImages(page: Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    for (const img of images) img.loading = "eager";
    await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
  });
}

test("the build exported the pages the site links to", () => {
  expect(PAGES.length).toBeGreaterThan(0);
  for (const url of ["/", "/series/", "/about/", "/catalogue/", "/data-structures/", "/data-structures/hashmap/"]) {
    expect(PAGES).toContain(`${BASE}${url}`);
  }
  expect(PAGES.some((url) => /^\/dsa-and-system-design-patterns\/catalogue\/[^/]+\/$/.test(url))).toBe(true);
  // At least one page carries an animation, so the still and player checks below check something.
  expect(PAGES.some((url) => stillsIn(fileFor(url)!).length > 0)).toBe(true);
});

// The not-found page is exported twice, as /404/ and /_not-found/, and both are checked below like
// any other page. This checks what a reader actually meets: a missing address answers 404 with it.
test("an address with no page answers 404 with the not-found page", async ({ page }) => {
  const response = await page.goto(`${BASE}/no-such-page/`);
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/Page not found/);
  await expect(page.locator("h1:visible")).toHaveText("Page not found");
  await expect(page.locator("#nd-sidebar a[href]").first()).toBeAttached();
});

test.describe("every page", () => {
  test.describe.configure({ mode: "parallel" });

  for (const url of PAGES) {
    test(url, async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      page.on("requestfailed", (request) => {
        if (new URL(request.url()).origin === origin) {
          problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`);
        }
      });
      page.on("response", (response) => {
        if (new URL(response.url()).origin === origin && response.status() >= 400) {
          problems.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });

      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState("networkidle");

      expect((await page.title()).trim()).not.toBe("");
      await expect(page.locator("h1:visible")).toHaveCount(1);
      // Fumadocs' docs layout: the sidebar with the page tree.
      await expect(page.locator("#nd-sidebar")).toBeAttached();
      await expect(page.locator("#nd-sidebar a[href]").first()).toBeAttached();

      // Every same-origin link names a built file, and its fragment names an id in that file.
      const hrefs = await page.$$eval("a[href]", (links) => links.map((a) => (a as HTMLAnchorElement).href));
      const broken: string[] = [];
      for (const href of new Set(hrefs)) {
        const target = new URL(href);
        if (target.origin !== origin) continue;
        const file = fileFor(target.pathname);
        if (file === null) {
          broken.push(`${href}: no file in out/`);
          continue;
        }
        const id = decodeURIComponent(target.hash.slice(1));
        if (id !== "" && !idsIn(file).has(id)) broken.push(`${href}: no element with id "${id}"`);
      }
      expect(broken).toEqual([]);

      // Every image has loaded and says what it shows.
      await settleImages(page);
      const images = await page.$$eval("img", (imgs) =>
        imgs.map((img) => ({ src: img.currentSrc || img.src, alt: img.getAttribute("alt"), width: img.naturalWidth })),
      );
      for (const image of images) {
        expect(image.width, `${image.src} did not load`).toBeGreaterThan(0);
        expect(image.alt?.trim(), `${image.src} has no alt text`).toBeTruthy();
      }

      // Each animation's still is built, and the page shows a player for it, not only the still.
      const stills = stillsIn(fileFor(url)!);
      expect(stills.filter((src) => fileFor(new URL(src, origin).pathname) === null)).toEqual([]);
      const players = await page.locator("figure[aria-label^='Animation:']").all();
      expect(players, "one player for each animation still").toHaveLength(stills.length);

      // Each player draws its scene, and Forward moves it on a step.
      for (const player of players) {
        await expect(player.locator("svg[role='img']")).toBeVisible();
        const label = player.getByText(/^step \d+ of \d+$/);
        await expect(label).toHaveText(/^step 1 of \d+$/);
        const total = Number((await label.textContent())!.match(/of (\d+)$/)![1]);
        expect(total).toBeGreaterThan(1);
        await player.getByRole("button", { name: "Forward" }).click();
        await expect(label).toHaveText(`step 2 of ${total}`);
      }

      await page.waitForLoadState("networkidle");
      expect(problems).toEqual([]);
    });
  }
});
