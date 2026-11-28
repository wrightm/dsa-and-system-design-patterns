import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../../../lib/source";

// Exported once at build time as a static Orama index.
export const revalidate = false;
// Fumadocs defaults to "multilingual"; the pages are all English.
// Stryker disable next-line StringLiteral: Orama reads an empty language as English, its own default.
export const { staticGET: GET } = createFromSource(source, { language: "english" });
