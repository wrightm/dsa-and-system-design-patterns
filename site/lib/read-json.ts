import fs from "node:fs";

/** A JSON file's contents. A file that is not JSON fails as `<shown>: not valid JSON (<why>)`. */
export function readJson(file: string, shown: string): unknown {
  // Stryker disable next-line StringLiteral: JSON.parse reads a Buffer as UTF-8 text too, so no test can tell.
  const text = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${shown}: not valid JSON (${(error as Error).message})`);
  }
}
