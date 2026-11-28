import { describe, expect, it, vi } from "vitest";
import { GET, revalidate } from "./route";

vi.mock("../../../.source/server", () => import("../../../test/docs"));

describe("the search index", () => {
  it("is exported once, at build time", () => {
    expect(revalidate).toBe(false);
  });

  it("is an English Orama index of every page", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const index = await response.json();
    expect(index.type).toBe("advanced");
    const text = JSON.stringify(index);
    for (const title of ["Home", "About", "Data structures", "Hash map", "No summary"]) expect(text).toContain(title);
    expect(text).toContain('"language":"english"');
  });
});
