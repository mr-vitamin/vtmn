import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CinematicWordmark } from "@/components/cinematic-wordmark";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startCinematicIntro } from "@/lib/cinematic-intro";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function scene() {
  let time = 0,
    id = 0,
    hidden = false;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, "now").mockImplementation(() => time);
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame));
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  const layer = document.createElement("div");
  layer.innerHTML = `<div class="vtmn-cinematic-stage">${renderToStaticMarkup(createElement(CinematicWordmark, { idPrefix: "test" }))}</div>`;
  const canvas = document.createElement("canvas");
  layer.append(canvas);
  document.body.append(layer);
  const ready = vi.fn(),
    exited = vi.fn();
  const controller = startCinematicIntro(canvas, layer, {
    onReady: ready,
    onExitComplete: exited,
  })!;
  const step = (at: number) => {
    time = at;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(at));
  };
  return {
    layer,
    canvas,
    controller,
    frames,
    ready,
    exited,
    ctx,
    step,
    visibility(value: boolean, at: number) {
      hidden = value;
      time = at;
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

describe("Real-time cinematic controller", () => {
  it("draws immediately, sequences formation, and stops its frame loop after the reveal", () => {
    const s = scene();
    expect(s.ctx.stroke.mock.calls.length).toBeGreaterThan(0);
    expect(s.layer.dataset["scene"]).toBe("awakening");
    expect(s.controller.enter()).toBe(false);
    s.step(1000);
    expect(s.layer.dataset["scene"]).toBe("convergence");
    s.step(3000);
    expect(s.layer.dataset["scene"]).toBe("reveal");
    expect(
      Number(s.layer.querySelector('[data-contact-mask="V_Center"]')!.getAttribute("r")),
    ).toBeGreaterThan(0);
    expect(
      Number(
        s.layer
          .querySelector('[data-contact-fragment="M_Left_Stem"]')!
          .getAttribute("data-contact-progress"),
      ),
    ).toBe(0);
    expect(s.ready).not.toHaveBeenCalled();
    s.step(4500);
    expect(s.layer.dataset["scene"]).toBe("settled");
    expect(
      [...s.layer.querySelectorAll("[data-contact-fragment]")].every(
        (fragment) => !fragment.hasAttribute("mask"),
      ),
    ).toBe(true);
    expect(
      [...s.layer.querySelectorAll("[data-contact-outline]")].every(
        (outline) => outline.getAttribute("opacity") === "0",
      ),
    ).toBe(true);
    expect(s.ready).toHaveBeenCalledTimes(1);
    expect(s.frames.size).toBe(0);
    s.controller.dispose();
  });

  it("pauses both sequence time and rendering while the document is hidden", () => {
    const s = scene();
    s.step(700);
    s.visibility(true, 700);
    expect(s.frames.size).toBe(0);
    s.visibility(false, 10700);
    s.step(11000);
    expect(s.layer.dataset["scene"]).toBe("convergence"); // Only 1000 visible milliseconds.
    expect(s.ready).not.toHaveBeenCalled();
    s.step(14500);
    expect(s.ready).toHaveBeenCalledTimes(1);
    s.controller.dispose();
  });

  it("caps high-DPI backing resolution and releases frames, listeners, and the bitmap", () => {
    vi.stubGlobal("innerWidth", 3840);
    vi.stubGlobal("innerHeight", 2160);
    vi.stubGlobal("devicePixelRatio", 3);
    const s = scene();
    expect(s.canvas.width).toBeLessThanOrEqual(1600);
    expect(s.canvas.height).toBeLessThanOrEqual(1000);
    expect(s.canvas.width * s.canvas.height).toBeLessThanOrEqual(1_200_000);
    s.controller.dispose();
    expect(s.frames.size).toBe(0);
    expect(s.canvas.width * s.canvas.height).toBe(1);
    const paints = s.ctx.clearRect.mock.calls.length;
    window.dispatchEvent(new Event("resize"));
    s.visibility(false, 9000);
    expect(s.ctx.clearRect.mock.calls.length).toBe(paints);
    expect(s.frames.size).toBe(0);
  });

  it("allows one 900ms aperture transition and ignores overlapping entry requests", () => {
    const s = scene();
    s.step(4500);
    expect(s.controller.enter()).toBe(true);
    expect(s.controller.enter()).toBe(false);
    s.step(4950);
    expect(Number.parseFloat(s.layer.style.getPropertyValue("--intro-aperture"))).toBeGreaterThan(
      50,
    );
    expect(s.exited).not.toHaveBeenCalled();
    s.step(5400);
    expect(s.exited).toHaveBeenCalledTimes(1);
    expect(s.frames.size).toBe(0);
    s.controller.dispose();
  });

  it("ignores touch input and wakes a finite ambient response only after the reveal", () => {
    const s = scene();
    s.step(4500);
    const move = (type: string) => {
      const e = new Event("pointermove");
      Object.assign(e, { pointerType: type, clientX: 900, clientY: 600 });
      s.layer.dispatchEvent(e);
    };
    move("touch");
    expect(s.frames.size).toBe(0);
    move("mouse");
    expect(s.frames.size).toBe(1);
    s.step(4610);
    expect(s.layer.style.getPropertyValue("--intro-cursor-x")).not.toBe("0px");
    expect(s.frames.size).toBe(0);
    s.controller.dispose();
  });
});
