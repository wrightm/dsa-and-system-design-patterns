import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { tempDir, writeFiles } from "../test/temp";
import { BASE, createServer, DEFAULTS, main, resolveFile } from "./serve";

// `out` has a sibling whose name starts the same, which a request must not reach.
const parent = tempDir("serve");
const root = path.join(parent, "out");
writeFiles(parent, {
  "out/index.html": "home",
  "out/404.html": "missing page",
  "out/a/index.html": "page a",
  "out/a/style.css": "body{}",
  "out/data.bin": "bytes",
  "out/..dots.txt": "dots",
  "out/empty/.keep": "",
  "out-evil/secret.txt": "secret",
  // A page in the folder above the export, which a request must not reach either.
  "index.html": "above",
  ...Object.fromEntries(["js", "json", "svg", "png", "txt", "woff2"].map((ext) => [`out/types/f.${ext}`, ext])),
});

describe("resolveFile", () => {
  it.each([
    [BASE, "index.html"],
    [`${BASE}/`, "index.html"],
    [`${BASE}/a/`, "a/index.html"],
    [`${BASE}/a`, "a/index.html"],
    [`${BASE}/a/style.css`, "a/style.css"],
    [`${BASE}/%2E%2Edots.txt`, "..dots.txt"],
  ])("serves %s from %s", (url, file) => {
    expect(resolveFile(url, root)).toBe(path.join(root, file));
  });

  it.each([
    ["the site root outside the base path", "/"],
    ["a path that only starts with the base path", `${BASE}x/index.html`],
    ["a missing file", `${BASE}/nope.html`],
    ["a folder with no index.html", `${BASE}/empty/`],
    ["an encoded step out of the export", `${BASE}/%2e%2e/out-evil/secret.txt`],
    ["the folder above the export", `${BASE}/%2e%2e`],
    ["a badly encoded path", `${BASE}/%E0%A4%A`],
  ])("serves nothing for %s", (_name, url) => {
    expect(resolveFile(url, root)).toBeNull();
  });
});

describe("createServer", () => {
  let server: Server | undefined;
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

  async function get(url: string, from = root) {
    server = createServer(from).listen(0);
    await new Promise((ready) => server!.once("listening", ready));
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://localhost:${port}${url}`);
    return { status: response.status, type: response.headers.get("content-type"), body: await response.text() };
  }

  it("serves a file with its content type", async () => {
    expect(await get(`${BASE}/a/style.css?v=1`)).toEqual({ status: 200, type: "text/css", body: "body{}" });
  });

  it.each([
    ["js", "text/javascript"],
    ["json", "application/json"],
    ["svg", "image/svg+xml"],
    ["png", "image/png"],
    ["txt", "text/plain; charset=utf-8"],
    ["woff2", "font/woff2"],
  ])("serves a .%s file as %s", async (ext, type) => {
    expect(await get(`${BASE}/types/f.${ext}`)).toEqual({ status: 200, type, body: ext });
  });

  it("serves a folder's index.html as HTML", async () => {
    expect(await get(`${BASE}/a/`)).toEqual({ status: 200, type: "text/html; charset=utf-8", body: "page a" });
  });

  it("serves an unknown file type as bytes", async () => {
    expect(await get(`${BASE}/data.bin`)).toEqual({ status: 200, type: "application/octet-stream", body: "bytes" });
  });

  it("answers 404 with the export's 404 page", async () => {
    expect(await get(`${BASE}/nope/`)).toEqual({ status: 404, type: "text/html; charset=utf-8", body: "missing page" });
  });

  it("answers 404 with plain words when the export has no 404 page", async () => {
    const bare = path.join(tempDir("serve-bare"), "out");
    fs.mkdirSync(bare);
    expect(await get(`${BASE}/`, bare)).toEqual({ status: 404, type: "text/html; charset=utf-8", body: "Not found" });
  });
});

describe("pnpm serve", () => {
  it("listens on the port given and says where", async () => {
    const lines: string[] = [];
    const server = main({ root, port: 0, log: (l) => lines.push(l) });
    await new Promise((ready) => server.once("listening", ready));
    const { port } = server.address() as { port: number };
    await new Promise<void>((done) => server.close(() => done()));
    expect(lines).toEqual([`serving ${root} at http://localhost:${port}${BASE}/`]);
  });

  it("defaults to the site's out folder on port 4173 and the console", () => {
    expect(DEFAULTS).toEqual({ root: path.resolve(import.meta.dirname, "..", "out"), port: 4173, log: console.log });
  });
});
