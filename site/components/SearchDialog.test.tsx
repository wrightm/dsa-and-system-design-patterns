// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { FrameworkProvider } from "fumadocs-core/framework";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider } from "./Provider";
import SearchDialog from "./SearchDialog";

// The real hook, recording where it was told to load the index from.
const from = vi.hoisted(() => ({ seen: [] as unknown[] }));
vi.mock("fumadocs-core/search/client", async (real) => {
  const actual = await real<typeof import("fumadocs-core/search/client")>();
  return {
    ...actual,
    useStaticSearch: (options: Parameters<typeof actual.useStaticSearch>[0]) => {
      from.seen.push(options);
      return actual.useStaticSearch(options);
    },
  };
});

// The router the Next.js provider would give it; the dialog only navigates on a chosen result.
const router = { push: () => {}, refresh: () => {} };
const framework = {
  useRouter: () => router,
  usePathname: () => "/",
  useParams: () => ({}),
};

function open(isOpen: boolean) {
  // jsdom lays nothing out, so it has no ResizeObserver; the dialog uses one to size its list.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render(
    <FrameworkProvider {...framework}>
      <SearchDialog open={isOpen} onOpenChange={() => {}} />
    </FrameworkProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  from.seen.length = 0;
});

describe("the search dialog", () => {
  it("searches the static index exported under the site's base path", () => {
    open(true);
    expect(from.seen.length).toBeGreaterThan(0);
    expect(new Set(from.seen.map((o) => JSON.stringify(o)))).toEqual(new Set(['{"from":"/api/search"}']));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search")).toBeTruthy();
  });

  it("renders nothing while closed", () => {
    open(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the provider", () => {
  it("is Fumadocs' root provider with the static search dialog", () => {
    const element = Provider({ children: <p>page</p> }) as ReactElement<Record<string, unknown>>;
    expect(element.type).toBe(RootProvider);
    expect(element.props).toEqual({ search: { SearchDialog }, children: <p>page</p> });
  });
});
