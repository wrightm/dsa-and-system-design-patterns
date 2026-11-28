import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET, OgCard, dynamic, generateStaticParams } from "./route";

const get = (...slug: string[]) => GET(new Request("http://localhost/"), { params: Promise.resolve({ slug }) });

describe("link-preview images", () => {
  it("are written at build time, one per article", () => {
    expect(dynamic).toBe("force-static");
    expect(generateStaticParams()).toEqual([
      { slug: ["data-structures", "hashmap", "image.png"] },
      { slug: ["data-structures", "no-summary", "image.png"] },
    ]);
  });

  it("draw an article as a 1200x630 PNG", async () => {
    const response = await get("data-structures", "hashmap", "image.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  it.each([
    ["a page that is not an article", ["about", "image.png"]],
    ["a page that does not exist", ["nope", "image.png"]],
  ])("are not found for %s", async (_name, slug) => {
    await expect(get(...slug)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it("show the title, the summary and the site's name under an indigo bar", () => {
    expect(renderToStaticMarkup(<OgCard title="Hash map" summary="Buckets." />)).toMatchInlineSnapshot(`"<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;background:#ffffff;border-top:24px solid #3f51b5;color:#1a1b2e"><div style="display:flex;flex-direction:column;gap:32px"><div style="font-size:60px;line-height:1.15">Hash map</div><div style="font-size:30px;line-height:1.4;color:#4a4d68">Buckets.</div></div><div style="font-size:28px;color:#3f51b5">DSA and system design patterns in Java</div></div>"`);
  });

  it("leave the summary empty for an article without one", () => {
    const markup = renderToStaticMarkup(<OgCard title="T" />);
    expect(markup).toContain('<div style="font-size:30px;line-height:1.4;color:#4a4d68"></div>');
  });
});
