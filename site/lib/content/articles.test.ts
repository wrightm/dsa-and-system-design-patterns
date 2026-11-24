import path from "node:path";
import { describe, expect, it } from "vitest";
import { findArticles, MODULES } from "./articles";

const fixtures = path.resolve(import.meta.dirname, "../../test/fixtures");

describe("findArticles", () => {
  it("returns only published articles", () => {
    const articles = findArticles(path.join(fixtures, "repo"));
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      module: "data-structures",
      slug: "hashmap",
      title: "Hash map: a fixture",
      summary: "A fixture article.",
      date: "2026-11-18",
      series: 1,
      tags: ["data-structures", "hashing"],
      sourcePath: "data-structures/src/main/java/learn/ds/hashmap/README.md",
    });
    expect(articles[0]!.body).toContain("# Hash map: a fixture");
    expect(articles[0]!.body).not.toContain("status: published");
  });

  it("names the file when a published article lacks a summary", () => {
    expect(() => findArticles(path.join(fixtures, "bad-summary"))).toThrow(
      /data-structures\/src\/main\/java\/learn\/ds\/thing\/README\.md: published but missing summary/,
    );
  });

  it("has the module table from collect.py", () => {
    expect(Object.keys(MODULES)).toHaveLength(11);
    expect(MODULES["data-structures"]).toEqual({
      title: "Data structures",
      description: "Structures built from scratch, each compared with the JDK or library version.",
      catalogue: "data-structures.md",
    });
    expect(MODULES["challenges"]!.catalogue).toBeNull();
  });
});
