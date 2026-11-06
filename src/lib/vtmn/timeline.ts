// Pure deterministic choreography; the renderer owns no independent timeline.
import { H, TOTAL_W } from "./brand";
export const T = { LOCK: 11.15, SURGE: 11.2, REVEAL: 13.15, TRANSITION: 14.45, END: 15.65 };
export const STAGE_Z = 0;
export const PHASES = [
  { start: 0.12, end: 3, flight: 0.64 },
  { start: 2.85, end: 5.15, flight: 0.6 },
  { start: 5, end: 8.15, flight: 0.76 },
  { start: 7.95, end: 11.15, flight: 0.84 },
];
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function surgeAt(x: number, t: number) {
  const u = (x + TOTAL_W / 2) / TOTAL_W;
  const reverse = Math.exp(-Math.pow((t - (11.25 + (1 - u) * 0.66)) / 0.105, 2));
  const forward = Math.exp(-Math.pow((t - (12.05 + u * 0.95)) / 0.15, 2));
  return t < T.SURGE || t > 13.5 ? 0 : reverse * 1.8 + forward * 2.8;
}
export interface CubeTiming {
  cx: number;
  cy: number;
  tActivate: number;
  tArrive: number;
  seed: number;
}
export interface CubeState {
  progress: number;
  energy: number;
  white: number;
  connected: boolean;
}
export function cubeState(
  ch: CubeTiming,
  t: number,
  out: CubeState = { progress: 0, energy: 0, white: 0, connected: false },
) {
  out.progress = clamp((t - ch.tActivate) / (ch.tArrive - ch.tActivate));
  out.connected = t >= ch.tArrive;
  const activation = t >= ch.tActivate ? Math.exp(-(t - ch.tActivate) * 5) * 1.8 : 0;
  const lock = t >= ch.tArrive ? Math.exp(-(t - ch.tArrive) * 5) * 1.5 : 0;
  const sustain = out.connected ? 0.13 + 0.1 * (0.5 + 0.5 * Math.sin(t * 4 - ch.seed)) : 0;
  out.energy =
    activation +
    lock +
    sustain +
    (out.connected ? surgeAt(ch.cx, t) * (0.65 + 0.35 * Math.sin(ch.cy * 2 + ch.seed) ** 2) : 0);
  out.white = smoothstep(T.REVEAL, T.REVEAL + 0.6, t);
  return out;
}
export type V3 = [number, number, number];
export interface CameraRig {
  aspect: number;
  pivot: V3;
  finalDistance: number;
  orbitRadius: number;
  fov: number;
}
export interface CameraSample {
  pos: V3;
  look: V3;
  fov: number;
  roll: number;
}
export function cameraRig(aspect: number): CameraRig {
  const a = Math.max(0.2, aspect),
    fov = 36,
    tan = Math.tan((fov * Math.PI) / 360);
  const fieldRadius = Math.hypot(TOTAL_W / 2 + 8, 10);
  // Responsive reference envelope. The flight varies its radius inside this
  // envelope; portrait views retain the same choreography with more distance.
  const orbitRadius = Math.max(
    55,
    fieldRadius / Math.sin(Math.atan(tan * a * 0.92)) + 1,
    fieldRadius + (H / 2 + 7 + 3.4) / (tan * 0.92) + 1,
  );
  return {
    aspect: a,
    pivot: [0, 0, -0.32],
    fov,
    orbitRadius,
    finalDistance: Math.max(65, (TOTAL_W * 1.25) / (2 * tan * a), (H * 3.4) / (2 * tan)),
  };
}
/** Integral of positive angular speed; smooth start/end, no interior pauses. */
export function orbitAngle(t: number) {
  if (t <= 0) return 0;
  if (t >= T.LOCK) return Math.PI * 2;
  const entry = 0.35,
    exit = 0.65,
    endRamp = T.LOCK - exit;
  let integral: number;
  if (t < entry) {
    const u = t / entry;
    integral = entry * (u ** 3 - 0.5 * u ** 4);
  } else if (t <= endRamp) integral = t - entry / 2;
  else {
    const u = (t - endRamp) / exit;
    integral = endRamp - entry / 2 + exit * (u - u ** 3 + 0.5 * u ** 4);
  }
  const q = integral / (T.LOCK - (entry + exit) / 2);
  // A small continuous speed variation crosses the edge-on angles more briskly.
  return 2 * Math.PI * (q - (0.14 * Math.sin(4 * Math.PI * q)) / (4 * Math.PI));
}
// Quintic blending gives radius, aim and FOV matching tangents/acceleration.
function flightBlend(a: number, b: number, x: number) {
  const u = clamp((x - a) / (b - a));
  return u * u * u * (10 + u * (-15 + 6 * u));
}
export function sampleCameraInto(rig: CameraRig, t: number, out: CameraSample) {
  const angle = orbitAngle(t),
    q = angle / (2 * Math.PI),
    wave = Math.sin(Math.PI * q) ** 2,
    reveal = flightBlend(0.82, 1, q);
  // Broad rear arc, a first-side approach and a deeper opposite-side sweep.
  // These analytic envelopes have no independently eased waypoint stops.
  const breathingRadius =
    rig.orbitRadius *
    (0.9 +
      0.16 * wave -
      0.1 * Math.exp(-Math.pow((q - 0.22) / 0.1, 2)) -
      0.28 * Math.exp(-Math.pow((q - 0.73) / 0.12, 2)));
  const distance = lerp(breathingRadius, rig.finalDistance, reveal);
  out.pos[0] = rig.pivot[0] + (t >= T.LOCK ? 0 : Math.sin(angle) * distance);
  out.pos[1] =
    6.5 + 16 * Math.sin(angle) + 5 * wave - 9 * Math.cos(angle) + 13.5 * flightBlend(0.72, 1, q);
  out.pos[2] = rig.pivot[2] + Math.cos(angle) * distance;
  out.look[0] = rig.pivot[0];
  // Lower the composition gently for the final wordmark and its floor image.
  out.look[1] = -0.5 - 1.5 * wave - 8.7 * flightBlend(0.78, 1, q);
  out.look[2] = rig.pivot[2];
  out.fov = rig.fov + 2 + 2 * wave - 2 * reveal;
  out.roll = ((2.6 * Math.PI) / 180) * Math.sin(angle) * wave;
  return out;
}
export function sampleCamera(rig: CameraRig, t: number) {
  return sampleCameraInto(rig, t, { pos: [0, 0, 0], look: [0, 0, 0], fov: 36, roll: 0 });
}
export function inspectionOptions(search: string) {
  const p = new URLSearchParams(search),
    raw = Number(p.get("t"));
  return { startAt: Number.isFinite(raw) ? clamp(raw, 0, T.END) : 0, hold: p.has("hold") };
}
export function phaseName(t: number) {
  if (t < 2.85) return "01 / V / IGNITION";
  if (t < 5) return "02 / T / TRANSFER";
  if (t < 7.95) return "03 / M / ESCALATION";
  if (t < T.SURGE) return "04 / N / CLIMAX";
  if (t < T.REVEAL) return "05 / CONNECTED SURGE";
  if (t < T.TRANSITION) return "06 / ELECTRIC GENESIS";
  return "07 / INTERFACE";
}
