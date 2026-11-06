import { T, clamp } from "./timeline";

export interface FinalIllumination {
  charge: number;
  resting: number;
}
function softRamp(a: number, b: number, t: number) {
  const u = clamp((t - a) / (b - a));
  return u * u * u * (10 + u * (-15 + 6 * u));
}
/** Material-only response to the existing surge. Does not change any clock,
 * cube state, propagation, light choreography or transition boundary. */
export function sampleFinalIllumination(t: number, out: FinalIllumination) {
  out.resting = softRamp(T.REVEAL - 0.1, T.REVEAL + 0.7, t);
  out.charge = softRamp(T.SURGE, T.REVEAL - 0.25, t) * (1 - out.resting);
  return out;
}
