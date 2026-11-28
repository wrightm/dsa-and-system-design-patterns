// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SourceExcerpt } from "./SourceExcerpt";

afterEach(cleanup);

describe("SourceExcerpt", () => {
  it("shows the real line numbers and marks the current line without relying on colour", () => {
    const lines = ["a", 'if (x < y && s == "<b>") {', "c"];
    const { container } = render(<SourceExcerpt excerpt={{ file: "Map.java", line: 41, start: 40, lines }} />);
    expect(container.textContent).toContain("Map.java, line 41");
    const current = container.querySelector("[data-current]")!;
    expect(current.getAttribute("data-current")).toBe("true");
    expect(container.querySelectorAll("[data-current]")).toHaveLength(1);
    expect(current.textContent).toBe(`Current line: 41${lines[1]}`);
    expect(container.querySelector("b")).toBeNull();
    expect(Array.from(container.querySelectorAll("code > span")).map((s) => s.textContent!.match(/\d+/)![0])).toEqual(["40", "41", "42"]);
  });

  it("shows a placeholder when the step names no line", () => {
    const { container } = render(<SourceExcerpt excerpt={null} />);
    expect(container.textContent).toContain("No line of code for this step.");
  });

  // Three lines either side of the current one, so the panel does not jump between steps.
  it("keeps the height of seven lines, with or without a line to show", () => {
    const tall = "calc(10.5em + 1rem)"; // 7 lines of 1.5em, as the browser simplifies it
    const withLine = render(<SourceExcerpt excerpt={{ file: "M.java", line: 1, start: 1, lines: ["a"] }} />);
    expect(withLine.container.querySelector("pre")!.style.minHeight).toBe(tall);
    cleanup();
    const without = render(<SourceExcerpt excerpt={null} />);
    expect((without.container.querySelector(".border-dashed") as HTMLElement).style.minHeight).toBe(tall);
  });
});
