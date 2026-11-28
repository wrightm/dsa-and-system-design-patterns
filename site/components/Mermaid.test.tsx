// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CHART = "graph TD; A-->B";

/** A stand-in for Mermaid that draws an SVG carrying the id it is given. */
function fakeMermaid({ parses = true, renders = true } = {}) {
  return {
    initialize: vi.fn(),
    parse: vi.fn(async () => parses),
    render: vi.fn(async (id: string, chart: string) => {
      if (!renders) throw new Error("cannot draw");
      return { svg: `<svg id="${id}"><style>#${id}{}</style><text>${chart}</text></svg>` };
    }),
  };
}

let mermaid: ReturnType<typeof fakeMermaid>;

/** Mermaid.tsx loaded afresh, so its cache of loads and drawings starts empty. */
async function load(api: ReturnType<typeof fakeMermaid> | "fails" = fakeMermaid()) {
  vi.resetModules();
  vi.doMock("mermaid", () => {
    if (api === "fails") throw new Error("offline");
    return { default: api };
  });
  if (api !== "fails") mermaid = api;
  return (await import("./Mermaid")).Mermaid;
}

async function show(...charts: string[]) {
  const Mermaid = await load(mermaid);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<p>loading</p>}>
        {charts.map((chart, i) => (
          <Mermaid key={i} chart={chart} />
        ))}
      </Suspense>,
    );
  });
  return result.container;
}

beforeEach(() => {
  mermaid = fakeMermaid();
});

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  vi.doUnmock("mermaid");
  vi.restoreAllMocks();
});

describe("Mermaid", () => {
  it("renders the diagram source on the server, for readers without JavaScript", async () => {
    const Mermaid = await load();
    expect(renderToString(<Mermaid chart={CHART} />)).toBe('<pre class="mermaid-source">graph TD; A--&gt;B</pre>');
    expect(mermaid.initialize).not.toHaveBeenCalled();
  });

  it("draws the chart in the browser with the page's font and the light theme", async () => {
    const container = await show(CHART);
    expect(mermaid.initialize).toHaveBeenCalledWith({ startOnLoad: false, fontFamily: "inherit", theme: "default" });
    expect(mermaid.parse).toHaveBeenCalledWith(CHART, { suppressErrors: true });
    const [id] = mermaid.render.mock.calls[0]!;
    expect(id).toMatch(/^mermaid-render-\d+$/);
    const diagram = container.querySelector("div.mermaid-diagram")!;
    expect(diagram.querySelector("text")!.textContent).toBe(CHART);
    expect(container.querySelector("pre")).toBeNull();
  });

  it("gives each drawing its own ids, so two identical charts never share them", async () => {
    const container = await show(CHART, CHART);
    expect(mermaid.render).toHaveBeenCalledTimes(1);
    const ids = Array.from(container.querySelectorAll("svg"), (svg) => svg.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.id).toMatch(/^mermaid-[a-zA-Z0-9]+$/);
      expect(svg.id).not.toMatch(/^mermaid-render-/);
      expect(svg.querySelector("style")!.textContent).toBe(`#${svg.id}{}`);
    }
  });

  it("draws in the dark theme when the page is dark, and again when the theme changes", async () => {
    document.documentElement.classList.add("dark");
    await show(CHART);
    expect(mermaid.initialize).toHaveBeenLastCalledWith({ startOnLoad: false, fontFamily: "inherit", theme: "dark" });
    await act(async () => {
      document.documentElement.classList.remove("dark");
      await new Promise((settled) => setTimeout(settled, 0));
    });
    expect(mermaid.initialize).toHaveBeenLastCalledWith({ startOnLoad: false, fontFamily: "inherit", theme: "default" });
    expect(mermaid.render).toHaveBeenCalledTimes(2);
  });

  it("ignores changes to the page's other attributes", async () => {
    await show(CHART);
    const before = mermaid.initialize.mock.calls.length;
    await act(async () => {
      document.documentElement.setAttribute("data-other", "x");
      await new Promise((settled) => setTimeout(settled, 0));
    });
    expect(mermaid.initialize).toHaveBeenCalledTimes(before);
  });

  it("stops watching the theme once the diagram is gone", async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    await show(CHART);
    expect(disconnect).not.toHaveBeenCalled();
    cleanup();
    expect(disconnect).toHaveBeenCalled();
  });

  it.each([
    ["does not parse, without asking Mermaid to draw it", { parses: false }, 0],
    ["parses but Mermaid fails to draw it", { renders: false }, 1],
  ])("shows the source, marked failed, when the chart %s", async (_name, options, draws) => {
    mermaid = fakeMermaid(options);
    const container = await show(CHART);
    expect(container.innerHTML).toBe('<pre class="mermaid-source" data-mermaid="failed">graph TD; A--&gt;B</pre>');
    expect(mermaid.render).toHaveBeenCalledTimes(draws);
  });

  it("shows the source, marked failed, when Mermaid cannot load", async () => {
    const Mermaid = await load("fails");
    let container!: HTMLElement;
    await act(async () => {
      container = render(
        <Suspense fallback={<p>loading</p>}>
          <Mermaid chart={CHART} />
        </Suspense>,
      ).container;
    });
    expect(container.innerHTML).toBe('<pre class="mermaid-source" data-mermaid="failed">graph TD; A--&gt;B</pre>');
  });
});
