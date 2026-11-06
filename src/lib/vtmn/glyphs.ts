// Cubic sampling of the authoritative polygons, preserving every intentional cut.
import { FRAGMENTS, H, TOTAL_W, LETTER_BOUNDS, type Pt } from "./brand";
import { rng, PHASES, STAGE_Z } from "./timeline";
export { FRAGMENTS, H, TOTAL_W };
export const CELL = 0.32;
export function containsPoint(x: number, y: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!,
      [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export interface Cell {
  x: number;
  y: number;
  z: number;
  sz: number;
  chunk: number;
  layer: number;
  h: number;
}
export interface Chunk {
  letter: number;
  fragment: number;
  cx: number;
  cy: number;
  parent: number;
  neighbors: number[];
  off: [number, number, number];
  axis: [number, number, number];
  angle: number;
  seed: number;
  tActivate: number;
  tArrive: number;
  dur: number;
}
export function buildWordmark() {
  const random = rng(71),
    cells: Cell[] = [],
    chunks: Chunk[] = [],
    lattice = new Map<string, number>();
  FRAGMENTS.forEach((f, fi) => {
    const minX = Math.min(...f.poly.map((p) => p[0])),
      maxX = Math.max(...f.poly.map((p) => p[0]));
    const minY = Math.min(...f.poly.map((p) => p[1])),
      maxY = Math.max(...f.poly.map((p) => p[1]));
    for (let gx = Math.floor(minX / CELL); gx <= Math.ceil(maxX / CELL); gx++)
      for (let gy = Math.floor(minY / CELL); gy <= Math.ceil(maxY / CELL); gy++) {
        const x = (gx + 0.5) * CELL,
          y = (gy + 0.5) * CELL,
          h = CELL * 0.47;
        if (![-h, h].every((dx) => [-h, h].every((dy) => containsPoint(x + dx, y + dy, f.poly))))
          continue;
        const ci = chunks.length,
          li = f.letter,
          b = LETTER_BOUNDS[li]!,
          side = Math.sign(x - b.cx) || 1;
        const ox =
          li === 0
            ? side * (1.2 + random() * 3.8)
            : li === 1
              ? (x - b.cx) * 0.5
              : li === 2
                ? side * (2 + random() * 4)
                : -side * (2 + random() * 4);
        const oy =
          li === 1
            ? (y > 2 ? 2 : -3) * (0.5 + random())
            : li === 3
              ? (y > 0 ? 1 : -1) * (1.5 + random() * 3)
              : (random() - 0.5) * 6;
        chunks.push({
          letter: li,
          fragment: fi,
          cx: x,
          cy: y,
          parent: -1,
          neighbors: [],
          off: [ox, oy, -2 - random() * 6],
          axis: [0.3 + random(), 0.3 + random(), 0.3 + random()],
          angle: (random() < 0.5 ? -1 : 1) * Math.PI * (0.5 + random()),
          seed: random() * 100,
          tActivate: 0,
          tArrive: 0,
          dur: PHASES[li]!.flight,
        });
        lattice.set(`${fi}:${gx}:${gy}`, ci);
        for (let layer = 0; layer < 3; layer++)
          cells.push({
            x,
            y,
            z: -layer * CELL,
            sz: layer === 0 ? 0.92 + random() * 0.16 : 1,
            chunk: ci,
            layer,
            h: random(),
          });
      }
  });
  // Local lattice edges form the conduction network. Gaps remain physically open.
  for (const [key, i] of lattice) {
    const [f, gx, gy] = key.split(":").map(Number) as [number, number, number];
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ]) {
      const j = lattice.get(`${f}:${gx + dx!}:${gy + dy!}`);
      if (j !== undefined) chunks[i]!.neighbors.push(j);
    }
  }
  // Dijkstra propagation with a nearest physical bridge when a brand cut disconnects a fragment.
  for (let li = 0; li < 4; li++) {
    const indices = chunks.flatMap((c, i) => (c.letter === li ? [i] : [])),
      b = LETTER_BOUNDS[li]!;
    const seedX = li === 1 ? b.cx : b.min,
      seedY = li === 2 ? -5 : 5;
    const root = indices.reduce(
      (best, i) =>
        Math.hypot(chunks[i]!.cx - seedX, chunks[i]!.cy - seedY) <
        Math.hypot(chunks[best]!.cx - seedX, chunks[best]!.cy - seedY)
          ? i
          : best,
      indices[0]!,
    );
    const dist = new Float64Array(chunks.length).fill(Infinity),
      visited = new Set<number>();
    dist[root] = 0;
    while (visited.size < indices.length) {
      let current = -1,
        shortest = Infinity;
      for (const i of indices)
        if (!visited.has(i) && dist[i]! < shortest) {
          current = i;
          shortest = dist[i]!;
        }
      if (current < 0) {
        let pa = -1,
          pb = -1,
          gap = Infinity;
        for (const i of visited)
          for (const j of indices)
            if (!visited.has(j)) {
              const a = chunks[i]!,
                bb = chunks[j]!,
                d = Math.hypot(a.cx - bb.cx, a.cy - bb.cy);
              if (d < gap) {
                gap = d;
                pa = i;
                pb = j;
              }
            }
        chunks[pa]!.neighbors.push(pb);
        chunks[pb]!.neighbors.push(pa);
        dist[pb] = dist[pa]! + gap;
        chunks[pb]!.parent = pa;
        continue;
      }
      visited.add(current);
      const a = chunks[current]!;
      for (const j of a.neighbors) {
        const bb = chunks[j]!,
          d = dist[current]! + Math.hypot(a.cx - bb.cx, a.cy - bb.cy);
        if (d < dist[j]!) {
          dist[j] = d;
          bb.parent = current;
        }
      }
    }
    const max = Math.max(...indices.map((i) => dist[i]!)),
      p = PHASES[li]!;
    for (const i of indices) {
      const c = chunks[i]!;
      c.tActivate = p.start + (dist[i]! / max) * (p.end - p.start - p.flight);
      c.tArrive = c.tActivate + c.dur;
    }
  }
  return { cells, chunks, stageZ: STAGE_Z };
}
