// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Step, Trace } from "../lib/trace/types";
import { Player } from "./Player";

function step(caption: string): Step {
  return {
    caption,
    source: null,
    state: {
      capacity: 16,
      size: 0,
      threshold: 12,
      buckets: [],
      focus: null,
      pipeline: null,
    },
  };
}

function traceOf(count: number): Trace {
  return {
    version: 1,
    id: "t",
    title: "T",
    kind: "hash-table",
    layout: "chains",
    steps: Array.from({ length: count }, (_, i) => step(`caption ${i + 1}`)),
  };
}

const renderStep = (s: Step, _p: Step | null, reduced: boolean) => (
  <span data-testid="frame">{`${s.caption}|${reduced}`}</span>
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Player", () => {
  it("Forward moves to step two", () => {
    render(<Player trace={traceOf(3)} renderStep={renderStep} />);
    expect(screen.getByText("step 1 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByText("step 2 of 3")).toBeTruthy();
    expect(screen.getByText("caption 2", { selector: "[aria-live]" })).toBeTruthy();
  });

  it("Right arrow does the same when focus is inside the player", () => {
    render(<Player trace={traceOf(3)} renderStep={renderStep} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Play" }), { key: "ArrowRight" });
    expect(screen.getByText("step 2 of 3")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Back" }), { key: "ArrowLeft" });
    expect(screen.getByText("step 1 of 3")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Back" }), { key: "End" });
    expect(screen.getByText("step 3 of 3")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Back" }), { key: "Home" });
    expect(screen.getByText("step 1 of 3")).toBeTruthy();
  });

  it("does not hijack keys typed into the speed select or scrubber", () => {
    render(<Player trace={traceOf(3)} renderStep={renderStep} />);
    fireEvent.keyDown(screen.getByLabelText("Speed"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByLabelText("Step"), { key: " " });
    expect(screen.getByText("step 1 of 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("Space on a focused button leaves activation to the button", () => {
    render(<Player trace={traceOf(3)} renderStep={renderStep} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Play" }), { key: " " });
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("scrubbing seeks and clamps string input", () => {
    render(<Player trace={traceOf(3)} renderStep={renderStep} />);
    fireEvent.change(screen.getByLabelText("Step"), { target: { value: "2" } });
    expect(screen.getByText("step 3 of 3")).toBeTruthy();
  });

  it("one step: renders the state with play and step controls disabled", () => {
    render(<Player trace={traceOf(1)} renderStep={renderStep} />);
    expect(screen.getByText("step 1 of 1")).toBeTruthy();
    expect(screen.getByTestId("frame").textContent).toBe("caption 1|false");
    for (const name of ["First", "Back", "Play", "Forward", "Last"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("zero steps: renders an empty frame without calling renderStep or footer", () => {
    const render1 = vi.fn();
    const footer = vi.fn();
    render(<Player trace={traceOf(0)} renderStep={render1} footer={footer} />);
    expect(screen.getByText("step 0 of 0")).toBeTruthy();
    expect(render1).not.toHaveBeenCalled();
    expect(footer).not.toHaveBeenCalled();
    for (const name of ["Play", "Back", "Forward"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("passes the previous step and renders the footer", () => {
    const seen: (string | null)[] = [];
    render(
      <Player
        trace={traceOf(3)}
        renderStep={(s, p) => {
          seen.push(p?.caption ?? null);
          return <span>{s.caption}</span>;
        }}
        footer={(s) => <p data-testid="footer">{`foot ${s.caption}`}</p>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(seen.at(-1)).toBe("caption 1");
    expect(screen.getByTestId("footer").textContent).toBe("foot caption 2");
  });

  describe("autoplay", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("advances on the timer and stops itself at the last step", () => {
      render(<Player trace={traceOf(3)} renderStep={renderStep} />);
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1800);
      });
      expect(screen.getByText("step 2 of 3")).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1800);
      });
      expect(screen.getByText("step 3 of 3")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText("step 3 of 3")).toBeTruthy();
    });

    it("divides the step duration by the speed", () => {
      render(<Player trace={traceOf(3)} renderStep={renderStep} />);
      fireEvent.change(screen.getByLabelText("Speed"), { target: { value: "2" } });
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(screen.getByText("step 2 of 3")).toBeTruthy();
    });

    it("clears the timer on unmount", () => {
      const { unmount } = render(<Player trace={traceOf(3)} renderStep={renderStep} />);
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("pauses when the tab is hidden", () => {
      render(<Player trace={traceOf(3)} renderStep={renderStep} />);
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("reduced motion", () => {
    it("tells renderStep and still autoplays", () => {
      vi.useFakeTimers();
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      render(<Player trace={traceOf(3)} renderStep={renderStep} />);
      expect(screen.getByTestId("frame").textContent).toBe("caption 1|true");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      act(() => {
        vi.advanceTimersByTime(1800);
      });
      expect(screen.getByText("step 2 of 3")).toBeTruthy();
    });
  });
});
