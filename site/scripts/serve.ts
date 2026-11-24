// Serves the static export in out/ under the GitHub Pages base path, for the smoke test.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const BASE = "/dsa-and-system-design-patterns";
const PORT = 4173;
const root = path.resolve(import.meta.dirname, "..", "out");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function resolve(urlPath: string): string | null {
  if (urlPath !== BASE && !urlPath.startsWith(`${BASE}/`)) return null;
  const file = path.join(root, decodeURIComponent(urlPath.slice(BASE.length)));
  if (!file.startsWith(root)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const index = path.join(file, "index.html");
  return fs.existsSync(index) ? index : null;
}

http
  .createServer((req, res) => {
    const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
    const file = resolve(urlPath);
    if (file === null) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      const notFound = path.join(root, "404.html");
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found");
      return;
    }
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`serving ${root} at http://localhost:${PORT}${BASE}/`));
