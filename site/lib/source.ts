import { loader } from "fumadocs-core/source";
import { docs } from "../.source/server";

// Stryker disable next-line StringLiteral: Fumadocs builds URLs from baseUrl's non-empty segments, so "" and "/" both mean the root.
export const source = loader({ baseUrl: "/", source: docs.toFumadocsSource() });
