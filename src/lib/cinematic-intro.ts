import {
  ACTIVATIONS,
  activationFrame,
  contactedTrailPoint,
  trailProgress,
  clamp,
  ease,
  type Curve,
  type LogoLayout,
} from "@/lib/cinematic-contacts";

export type CinematicIntro = {
  enter: () => boolean;
  dispose: () => void;
};

type Options = { onReady: () => void; onExitComplete: () => void };
const duration = 4500;
const exitDuration = 900;

// Deliberately composed paths, not a random particle or lightning simulation.
const paths = [
  [
    [0.025, 0.62],
    [0.3, 0.08],
    [0.64, 0.9],
    [1.03, 0.36],
  ],
  [
    [-0.05, 0.19],
    [0.18, 0.02],
    [0.34, 0.8],
    [0.5, 0.48],
  ],
  [
    [1.05, 0.85],
    [0.86, 1.02],
    [0.7, 0.09],
    [0.5, 0.48],
  ],
  [
    [0.89, -0.04],
    [0.54, 0.06],
    [0.86, 0.65],
    [0.5, 0.48],
  ],
  [
    [0.09, 1.03],
    [0.51, 0.83],
    [0.11, 0.22],
    [0.5, 0.48],
  ],
  [
    [0.46, -0.04],
    [0.08, 0.37],
    [0.91, 0.28],
    [0.5, 0.48],
  ],
  [
    [0.56, 1.04],
    [0.89, 0.72],
    [0.15, 0.68],
    [0.5, 0.48],
  ],
] as const satisfies readonly Curve[];

export { paths as CINEMATIC_PATHS };

export function finishCinematicWordmark(layer: HTMLElement) {
  for (const polygon of layer.querySelectorAll("[data-contact-fragment]"))
    polygon.removeAttribute("mask");
  for (const outline of layer.querySelectorAll("[data-contact-outline]"))
    outline.setAttribute("opacity", "0");
}

/** Owns one bounded real-time sequence, then sleeps until interaction or exit. */
export function startCinematicIntro(
  canvas: HTMLCanvasElement,
  layer: HTMLElement,
  options: Options,
): CinematicIntro | null {
  let context: CanvasRenderingContext2D | null;
  try {
    context = canvas.getContext("2d", { alpha: true });
  } catch {
    return null;
  }
  if (!context) return null;
  const ctx = context;
  const theme = getComputedStyle(layer);
  const primary = theme.getPropertyValue("--primary").trim();
  const silver = theme.getPropertyValue("--foreground").trim();
  const soft = theme.getPropertyValue("--accent-glow").trim();
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let width = 1,
    height = 1,
    scale = 1;
  let frame = 0,
    elapsed = 0,
    exitElapsed = 0;
  let last = performance.now();
  let exiting = false,
    disposed = false,
    announced = false;
  let cursorX = 0,
    cursorY = 0,
    targetX = 0,
    targetY = 0;
  let scene = "";
  let logoLayout: LogoLayout = { left: 0, top: 0, width: 1, height: 1 };
  const fragments = ACTIVATIONS.map((activation) => ({
    activation,
    polygon: layer.querySelector(`[data-contact-fragment="${activation.id}"]`),
    mask: layer.querySelector(`[data-contact-mask="${activation.id}"]`),
    outline: layer.querySelector(`[data-contact-outline="${activation.id}"]`),
  }));
  const point = (curve: Curve, t: number, w: number, h: number, time: number, index: number) =>
    contactedTrailPoint(curve, t, w, h, time, index, logoLayout);

  const set = (key: string, value: number | string) => layer.style.setProperty(key, String(value));

  function ribbon(curve: Curve, progress: number, time: number, index: number) {
    if (progress < 0 || progress > 1.34) return;
    const end = Math.min(1, progress);
    const start = Math.max(0, progress - 0.34);
    if (end <= start) return;
    const strength = Math.min(1, (end - start) / 0.15);
    ctx.beginPath();
    for (let step = 0; step <= 40; step++) {
      const t = start + ((end - start) * step) / 40;
      const [x, y] = point(curve, t, width, height, time, index);
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineCap = "round";
    for (const [lineWidth, alpha, color] of [
      [12, 0.05, primary],
      [3, 0.36, primary],
      [0.9, 0.88, soft],
    ] as const) {
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha * strength;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    const [x, y] = point(curve, end, width, height, time, index);
    const light = ctx.createRadialGradient(x, y, 0, x, y, 19);
    light.addColorStop(0, silver);
    light.addColorStop(0.15, soft);
    light.addColorStop(1, "transparent");
    ctx.fillStyle = light;
    ctx.globalAlpha = 0.62 * strength;
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.fill();
  }

  function ring(radius: number, alpha: number, rotation = -0.18) {
    ctx.beginPath();
    ctx.ellipse(
      width * 0.5 + cursorX,
      height * 0.48 + cursorY,
      width * radius,
      height * radius * 0.4,
      rotation,
      0,
      Math.PI * 2,
    );
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = soft;
    ctx.stroke();
  }

  function paint() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    const formation = ease((elapsed - 2700) / 1500);
    const pulse = Math.sin(Math.PI * clamp((elapsed - 3150) / 850));
    const nextScene =
      elapsed < 1000
        ? "awakening"
        : elapsed < 3000
          ? "convergence"
          : elapsed < duration
            ? "reveal"
            : "settled";
    if (nextScene !== scene) {
      scene = nextScene;
      layer.dataset["scene"] = scene;
    }
    for (const { activation, polygon, mask, outline } of fragments) {
      const contact = activationFrame(activation, elapsed);
      mask?.setAttribute("r", String(contact.radius));
      polygon?.setAttribute("data-contact-progress", String(contact.progress));
      outline?.setAttribute("opacity", String(contact.outline));
      if (contact.complete) polygon?.removeAttribute("mask");
    }
    set("--intro-shear", `${-6 * (1 - formation)}deg`);
    set("--intro-bloom", pulse);
    set("--intro-light", Math.min(0.17, formation * 0.12 + pulse * 0.05));
    set("--intro-cursor-x", `${cursorX}px`);
    set("--intro-cursor-y", `${cursorY}px`);
    if (elapsed < 4100 && !exiting) {
      ribbon(paths[0], trailProgress(0, elapsed), elapsed, 0);
      for (const [i, curve] of paths.entries())
        if (i > 0) ribbon(curve, trailProgress(i, elapsed), elapsed, i);
    }
    if (elapsed > 1600) {
      const depth = ease((elapsed - 1600) / 1700);
      const settle = 1 - ease((elapsed - 4100) / 400);
      ring(0.43 - depth * 0.06, 0.045 * depth * settle);
      ring(0.32 + depth * 0.03, 0.025 * depth * settle, 0.15);
    }
    if (pulse > 0.001) ring(0.05 + ease((elapsed - 3150) / 850) * 0.56, pulse * 0.24);
    if (exiting) {
      const exit = ease(exitElapsed / exitDuration);
      set("--intro-exit", exit);
      set("--intro-aperture", `${exit * 145}%`);
      ring(0.12 + exit * 1.2, (1 - exit) * 0.35);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width || window.innerWidth);
    height = Math.max(1, bounds.height || window.innerHeight);
    const stage = layer.querySelector(".vtmn-cinematic-stage")?.getBoundingClientRect();
    const logoWidth =
      height <= 480 ? Math.min(width * 0.68, height * 0.95) : Math.min(width * 0.9, 1140);
    logoLayout =
      stage && stage.width > 0
        ? {
            left: stage.left - bounds.left,
            top: stage.top - bounds.top,
            width: stage.width,
            height: stage.height,
          }
        : {
            left: (width - logoWidth) / 2,
            top: height * (height <= 480 ? 0.43 : 0.48) - logoWidth * 0.11,
            width: logoWidth,
            height: logoWidth * 0.22,
          };
    scale = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      1600 / width,
      1000 / height,
      Math.sqrt(1_200_000 / (width * height)),
    );
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    paint();
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const delta = Math.max(0, now - last);
    last = now;
    if (exiting) exitElapsed = Math.min(exitDuration, exitElapsed + delta);
    else elapsed = Math.min(duration, elapsed + delta);
    const smoothing = Math.min(1, delta / 110);
    cursorX += (targetX - cursorX) * smoothing;
    cursorY += (targetY - cursorY) * smoothing;
    paint();
    if (!announced && elapsed === duration) {
      announced = true;
      options.onReady();
    }
    if (exiting && exitElapsed === exitDuration) {
      options.onExitComplete();
      return;
    }
    if (
      elapsed < duration ||
      exiting ||
      Math.abs(targetX - cursorX) + Math.abs(targetY - cursorY) > 0.02
    )
      schedule();
  }

  function schedule() {
    if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frame) last = performance.now();
    schedule();
  }
  function visibility() {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else {
      last = performance.now();
      paint();
      if (elapsed < duration || exiting) schedule();
    }
  }
  function move(event: PointerEvent) {
    if (!announced || exiting || !finePointer.matches || event.pointerType !== "mouse") return;
    targetX = (event.clientX / width - 0.5) * 18;
    targetY = (event.clientY / height - 0.5) * 12;
    wake();
  }
  function leave() {
    targetX = targetY = 0;
    if (announced && !exiting) wake();
  }

  resize(); // Draw a visible filament immediately, before the first scheduled frame.
  schedule();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  layer.addEventListener("pointermove", move, { passive: true });
  layer.addEventListener("pointerleave", leave);
  finePointer.addEventListener("change", leave);

  return {
    enter() {
      if (disposed || !announced || exiting) return false;
      exiting = true;
      exitElapsed = 0;
      wake();
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      layer.removeEventListener("pointermove", move);
      layer.removeEventListener("pointerleave", leave);
      finePointer.removeEventListener("change", leave);
      canvas.width = canvas.height = 1;
    },
  };
}
