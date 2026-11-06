import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import IntroScene from "@/components/vtmn/IntroScene";
import { T } from "@/lib/vtmn/timeline";
import type { ReactElement } from "react";
const capture = vi.hoisted(() => ({
  props: null as null | { onTick: (t: number) => void; startAt: number; hold: boolean },
}));
vi.mock("@react-three/fiber", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-three/fiber")>()),
  Canvas: ({ children }: { children: ReactElement }) => {
    capture.props = children.props as typeof capture.props;
    return <div data-testid="approved-canvas-boundary" />;
  },
}));
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});
describe("production scene interface", () => {
  it("ignores prototype inspection queries and completes the approved production timing", () => {
    window.history.replaceState({}, "", "/?t=5&hold=1");
    const transition = vi.fn(),
      end = vi.fn();
    render(<IntroScene fading={false} onEnd={end} onTransition={transition} />);
    expect(capture.props!.startAt).toBe(0);
    expect(capture.props!.hold).toBe(false);
    act(() => capture.props!.onTick(T.TRANSITION));
    expect(transition).toHaveBeenCalledTimes(1);
    act(() => capture.props!.onTick(T.END));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("retains the Canvas boundary without any prototype decorative interface", () => {
    const { container } = render(
      <IntroScene fading={false} onEnd={() => {}} onTransition={() => {}} />,
    );
    expect(screen.getByTestId("approved-canvas-boundary")).toBeInTheDocument();
    expect(container.querySelector(".vt-intro-hud")).toBeNull();
    expect(
      screen.queryByText(/ELECTRIC GENESIS|MATTER \/ CURRENT \/ IDENTITY|T\+/),
    ).not.toBeInTheDocument();
    expect(container.querySelector("span")).toBeNull();
  });
});
