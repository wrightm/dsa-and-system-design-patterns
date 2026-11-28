import { source } from "./source";

type Page = NonNullable<ReturnType<typeof source.getPage>>;

/** Pages that get a link-preview image: the articles, which carry a series number. */
export function isArticle(page: Page): boolean {
  return page.data.series !== undefined;
}

/** Path of a page's link-preview image, without the base path. */
export function ogImagePath(page: Page): string {
  return `/og/${[...page.slugs, "image.png"].join("/")}`;
}
