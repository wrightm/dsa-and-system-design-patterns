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
    expect(current.textContent).toBe(`Current line: 41${lines[1]}`);
    expect(container.querySelector("b")).toBeNull();
    expect(Array.from(container.querySelectorAll("code > span")).map((s) => s.textContent!.match(/\d+/)![0])).toEqual(["40", "41", "42"]);
  });

  it("shows a placeholder when the step names no line", () => {
    const { container } = render(<SourceExcerpt excerpt={null} />);
    expect(container.textContent).toContain("No line of code for this step.");
  });
});
