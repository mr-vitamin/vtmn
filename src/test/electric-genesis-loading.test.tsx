import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Entrance } from "@/components/entrance";
vi.mock("@/components/vtmn/IntroScene", () => new Promise(() => {}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.startsWith("(min-width: 1024px)"),
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: () => null,
  } as unknown as WebGL2RenderingContext);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const home = (
  <main>
    <h1>Real Homepage</h1>
  </main>
);
describe("stalled scene chunk", () => {
  it("fails open within twelve seconds, keeping real content mounted", async () => {
    render(<Entrance pathname="/">{home}</Entrance>);
    expect(screen.getByRole("button", { name: /skip intro/i })).toBeInTheDocument();
    expect(screen.getByText("Real Homepage")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(12000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
  it("allows immediate skip while loading and clears its timeout", () => {
    render(<Entrance pathname="/">{home}</Entrance>);
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
