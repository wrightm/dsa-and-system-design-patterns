// Serves the static export in out/ under the GitHub Pages base path, for the smoke test.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

export const BASE = "/dsa-and-system-design-patterns";

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

/**
 * The file under `root` a request path names, or null when it names none: outside the base path,
 * badly encoded, outside `root`, or missing. A folder serves its `index.html`.
 */
export function resolveFile(urlPath: string, root: string): string | null {
  if (urlPath !== BASE && !urlPath.startsWith(`${BASE}/`)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.slice(BASE.length));
  } catch {
    return null;
  }
  const file = path.join(root, decoded);
  const inside = path.relative(root, file);
  if (inside === ".." || inside.startsWith(`..${path.sep}`)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const index = path.join(file, "index.html");
  return fs.existsSync(index) ? index : null;
}

/** A server for the export in `root`: 200 with the file's type, else 404 with `404.html`. */
export function createServer(root: string): http.Server {
  return http.createServer((req, res) => {
    // A server's request always has a url; only a client's own request leaves it unset.
    const file = resolveFile(new URL(req.url!, "http://localhost").pathname, root);
    if (file === null) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      const notFound = path.join(root, "404.html");
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

export type ServeDeps = { root: string; port: number; log: (line: string) => void };

/** The site's `out/` on port 4173, and the console. */
export const DEFAULTS: ServeDeps = {
  root: path.resolve(import.meta.dirname, "..", "out"),
  port: 4173,
  log: console.log,
};

/** `pnpm serve`: serves `root` until stopped. */
export function main({ root, port, log }: ServeDeps): http.Server {
  const server = createServer(root);
  return server.listen(port, () => {
    const { port: bound } = server.address() as { port: number };
    log(`serving ${root} at http://localhost:${bound}${BASE}/`);
  });
}
