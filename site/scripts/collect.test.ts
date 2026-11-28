import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES, tempDir } from "../test/temp";
import { DEFAULTS, main } from "./collect";

function site() {
  const siteDir = tempDir("collect-main");
  fs.cpSync(path.resolve(import.meta.dirname, "../content-src"), path.join(siteDir, "content-src"), { recursive: true });
  return siteDir;
}

function run(repoRoot: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = main({ repoRoot, siteDir: site(), log: (l) => out.push(l), error: (l) => err.push(l) });
  return { code, out, err };
}

describe("pnpm collect", () => {
  it("lists each collected article with its series number and exits 0", () => {
    expect(run(path.join(FIXTURES, "repo"))).toEqual({
      code: 0,
      out: ["collected 1 published article(s)", "    1  data-structures/hashmap.md"],
      err: [],
    });
  });

  it("prints only the error and exits 1 when collecting fails", () => {
    expect(run(path.join(FIXTURES, "bad-summary"))).toEqual({
      code: 1,
      out: [],
      err: ["data-structures/src/main/java/learn/ds/thing/README.md: published but missing summary"],
    });
  });

  it("defaults to this site, the repository around it and the console", () => {
    const siteDir = path.resolve(import.meta.dirname, "..");
    expect(DEFAULTS).toEqual({ siteDir, repoRoot: path.dirname(siteDir), log: console.log, error: console.error });
  });
});
