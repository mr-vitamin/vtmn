import { StrictMode, useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Entrance } from "@/components/entrance";

const controls = vi.hoisted(() => ({ fail: false, mounts: 0, disposals: 0 }));
vi.mock("@/components/vtmn/IntroScene", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MockScene({
      onTransition,
      onEnd,
    }: {
      onTransition: () => void;
      onEnd: () => void;
    }) {
      useEffect(() => {
        controls.mounts++;
        return () => {
          controls.disposals++;
        };
      }, []);
      if (controls.fail) throw new Error("renderer failed");
      return (
        <div data-testid="scene">
          <button onClick={onTransition}>scene transition</button>
          <button onClick={onEnd}>scene end</button>
        </div>
      );
    },
  };
});
const desktopQuery = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const motionQuery = "(prefers-reduced-motion: reduce)";
let desktop = true,
  reduced = false;
const listeners = new Map<string, Set<() => void>>();
const home = (
  <main>
    <h1>Real VTMN Homepage</h1>
    <a href="/archive">The Archive</a>
  </main>
);
function preference(query: string, value: boolean) {
  if (query === desktopQuery) desktop = value;
  else reduced = value;
  act(() => {
    listeners.get(query)?.forEach((fn) => fn());
  });
}
beforeEach(() => {
  desktop = true;
  reduced = false;
  controls.fail = false;
  controls.mounts = 0;
  controls.disposals = 0;
  listeners.clear();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        get matches() {
          return query === desktopQuery ? desktop : query === motionQuery ? reduced : false;
        },
        media: query,
        addEventListener: (_: string, fn: () => void) => {
          if (!listeners.has(query)) listeners.set(query, new Set());
          listeners.get(query)!.add(fn);
        },
        removeEventListener: (_: string, fn: () => void) => {
          listeners.get(query)?.delete(fn);
        },
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
  document.body.style.overflow = "";
});

describe("integrated Electric Genesis entrance", () => {
  it("plays on eligible desktop while keeping the real Homepage mounted", async () => {
    const mounts = vi.fn(),
      unmounts = vi.fn();
    function Home() {
      useEffect(() => {
        mounts();
        return unmounts;
      }, []);
      return home;
    }
    const { container } = render(
      <Entrance pathname="/">
        <Home />
      </Entrance>,
    );
    await screen.findByTestId("scene");
    const heading = screen.getByText("Real VTMN Homepage");
    expect(container.querySelector("#vtmn-content")).toHaveAttribute("inert");
    fireEvent.click(screen.getByText("scene transition"));
    expect(screen.getByTestId("scene")).toBeInTheDocument();
    expect(screen.getByText("Real VTMN Homepage")).toBe(heading);
    fireEvent.click(screen.getByText("scene end"));
    expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
    expect(container.querySelector("#vtmn-content")).not.toHaveAttribute("inert");
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(unmounts).not.toHaveBeenCalled();
    expect(controls.disposals).toBe(1);
  });
  it("keeps only an accessible bottom-right Skip control and immediately cleans up", async () => {
    render(<Entrance pathname="/">{home}</Entrance>);
    await screen.findByTestId("scene");
    const skip = screen.getByRole("button", { name: /^skip intro$/i });
    expect(skip).toHaveClass("vtmn-electric-skip");
    expect(skip).toHaveAttribute("type", "button");
    expect(skip).toHaveFocus();
    expect(screen.queryByText("VTMN / ELECTRIC GENESIS")).not.toBeInTheDocument();
    fireEvent.keyDown(skip, { key: "Tab", shiftKey: true });
    expect(skip).toHaveFocus();
    fireEvent.click(skip);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controls.disposals).toBe(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
  it("supports Escape and preserves existing body styles", async () => {
    document.body.style.overflow = "auto";
    render(<Entrance pathname="/">{home}</Entrance>);
    await screen.findByTestId("scene");
    fireEvent.keyDown(screen.getByRole("button", { name: /^skip intro$/i }), { key: "Escape" });
    expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
  });
  it.each(["mobile", "reduced motion"])(
    "bypasses %s without probing WebGL or mounting the scene",
    async (mode) => {
      if (mode === "mobile") desktop = false;
      else reduced = true;
      render(<Entrance pathname="/">{home}</Entrance>);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
      expect(controls.mounts).toBe(0);
      expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    },
  );
  it.each(["/archive", "/about", "/archive/wren-discord-bot", "/missing"])(
    "never plays on direct %s or later Home navigation",
    (path) => {
      const { rerender } = render(<Entrance pathname={path}>{home}</Entrance>);
      rerender(<Entrance pathname="/">{home}</Entrance>);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    },
  );
  it("dismisses on navigation and never replays on returning Home", async () => {
    const { rerender } = render(<Entrance pathname="/">{home}</Entrance>);
    await screen.findByTestId("scene");
    rerender(<Entrance pathname="/about">{home}</Entrance>);
    expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
    rerender(<Entrance pathname="/">{home}</Entrance>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controls.disposals).toBe(1);
  });
  it.each([motionQuery, desktopQuery])("cleans up on eligibility change: %s", async (query) => {
    render(<Entrance pathname="/">{home}</Entrance>);
    await screen.findByTestId("scene");
    preference(query, query === motionQuery);
    expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
    expect(controls.disposals).toBe(1);
  });
  it.each(["unavailable", "throws"])("fails open when WebGL %s", (mode) => {
    if (mode === "throws")
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => {
        throw new Error("blocked");
      });
    else vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    render(<Entrance pathname="/">{home}</Entrance>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controls.mounts).toBe(0);
  });
  it("fails open if the lazy renderer errors", async () => {
    controls.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Entrance pathname="/">{home}</Entrance>);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });
  it("retains lifecycle and preference cleanup under Strict Mode", async () => {
    render(
      <StrictMode>
        <Entrance pathname="/">{home}</Entrance>
      </StrictMode>,
    );
    await screen.findByTestId("scene");
    preference(motionQuery, true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controls.mounts).toBe(controls.disposals);
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
});
