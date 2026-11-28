import path from "node:path";
import { describe, expect, it } from "vitest";
import { tempDir, writeFiles } from "../test/temp";
import { readJson } from "./read-json";

describe("readJson", () => {
  it("parses the file, reading it as UTF-8", () => {
    const dir = tempDir("json");
    writeFiles(dir, { "a.json": '{"key":"café ✓"}' });
    expect(readJson(path.join(dir, "a.json"), "a.json")).toEqual({ key: "café ✓" });
  });

  it("names the file and the reason when it is not JSON", () => {
    const dir = tempDir("json");
    writeFiles(dir, { "a.json": "{" });
    expect(() => readJson(path.join(dir, "a.json"), "shown/a.json")).toThrow(
      /^shown\/a\.json: not valid JSON \(.+\)$/,
    );
  });
});
