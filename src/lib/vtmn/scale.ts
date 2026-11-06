import { T, smoothstep } from "./timeline";

export const WORDMARK_SCALE = 1.15;
export const CUBE_SCALE = 1.25;
// Compensate for the stage scale: 1.15 * (1.25 / 1.15) = 1.25.
export const CUBE_GEOMETRY_SCALE = CUBE_SCALE / WORDMARK_SCALE;

/** Lens-only clearance for the measured enlarged desktop return/ultrawide
 * close pass. Position, aim, roll, angular motion and portrait lens stay intact. */
export function scaleFramingPadding(aspect: number, t: number) {
  const desktop = smoothstep(1, 1.6, aspect);
  if (!desktop || t >= T.LOCK) return 0;
  const ultrawide = smoothstep(1.77, 1.9, aspect);
  const gate = smoothstep(6.5, 7.5, t) * (1 - smoothstep(T.LOCK - 0.35, T.LOCK, t));
  return (
    desktop *
    gate *
    ((1 + 3.6 * ultrawide) * Math.exp(-Math.pow((t - 8.2) / 0.9, 2)) +
      (1.65 + 1.3 * ultrawide) * Math.exp(-Math.pow((t - 10.05) / 0.65, 2)))
  );
}
