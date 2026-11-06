/** Local electricity never joins different letters or spans a moving debris field. */
export const MAX_LOCAL_ARC = 1.3;
export function localArcAllowed(
  chunks: readonly { letter: number }[],
  positions: Float32Array,
  active: Float32Array,
  a: number,
  b: number,
) {
  if (a === b || !active[a] || !active[b] || chunks[a]?.letter !== chunks[b]?.letter) return false;
  const ai = a * 3,
    bi = b * 3;
  const distance = Math.hypot(
    positions[ai]! - positions[bi]!,
    positions[ai + 1]! - positions[bi + 1]!,
    positions[ai + 2]! - positions[bi + 2]!,
  );
  return Number.isFinite(distance) && distance > 0.00001 && distance <= MAX_LOCAL_ARC;
}
