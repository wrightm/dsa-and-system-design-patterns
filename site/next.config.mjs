import { createMDX } from "fumadocs-mdx/next";

const basePath = "/dsa-and-system-design-patterns";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  // fumadocs-mdx would add md and mdx here, which makes the old MkDocs `pages/` folder a Pages Router.
  pageExtensions: ["tsx", "ts"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default createMDX()(config);
