import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

const made: string[] = [];
afterAll(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A fresh folder under the system temp folder, removed after the test file. */
export function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  made.push(dir);
  return dir;
}

/** Writes `files` (relative path to text) under `dir`, making folders as needed. */
export function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
}

export const FIXTURES = path.resolve(import.meta.dirname, "fixtures");
