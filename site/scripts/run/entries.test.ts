import { afterEach, describe, expect, it, vi } from "vitest";

// Each entry hands its script's defaults (and, for video, the arguments) to its main and makes the
// result the exit code. The mains are replaced, so nothing here collects, renders or serves.
const calls: unknown[][] = [];
const fake = (code: unknown) => ({ DEFAULTS: { marker: code }, main: (...args: unknown[]) => (calls.push(args), code) });
vi.mock("../collect", () => fake(3));
vi.mock("../render-stills", () => fake(4));
vi.mock("../render-video", () => fake(Promise.resolve(5)));
vi.mock("../serve", () => fake("server"));

const argv = process.argv;
afterEach(() => {
  process.exitCode = undefined;
  process.argv = argv;
  calls.length = 0;
});

describe("script entries", () => {
  it("collect exits with main's code", async () => {
    await import("./collect");
    expect(calls).toEqual([[{ marker: 3 }]]);
    expect(process.exitCode).toBe(3);
  });

  it("render-stills exits with main's code", async () => {
    await import("./render-stills");
    expect(calls).toEqual([[{ marker: 4 }]]);
    expect(process.exitCode).toBe(4);
  });

  it("render-video passes the arguments after the script and exits with main's code", async () => {
    process.argv = ["node", "render-video.ts", "a/b/c", "out.mp4"];
    await import("./render-video");
    expect(calls).toEqual([[["a/b/c", "out.mp4"], { marker: expect.any(Promise) }]]);
    expect(process.exitCode).toBe(5);
  });

  it("serve starts main and leaves the exit code alone", async () => {
    await import("./serve");
    expect(calls).toEqual([[{ marker: "server" }]]);
    expect(process.exitCode).toBeUndefined();
  });
});
