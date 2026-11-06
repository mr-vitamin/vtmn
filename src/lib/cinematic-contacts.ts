import artwork from "@/assets/brand/vtmn-wordmark.svg?raw";

export type Point = readonly [number, number];
export type Curve = readonly [Point, Point, Point, Point];
export type LogoLayout = { left: number; top: number; width: number; height: number };
export const WORDMARK_VIEWBOX = artwork.match(/viewBox="([^"]+)"/)![1]!;
export const FRAGMENTS = [...artwork.matchAll(/<polygon\b([^>]+)\/>/g)].map((match) => {
  const attributes = match[1]!;
  const id = attributes.match(/\bid="([^"]+)"/)![1]!;
  const pointsText = attributes.match(/\bpoints="([^"]+)"/)![1]!;
  const values = pointsText
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const points: Point[] = [];
  for (let i = 0; i < values.length; i += 2) points.push([values[i]!, values[i + 1]!]);
  return { id, pointsText, points };
});
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const mix = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const vertex = (fragment: string, index: number) =>
  FRAGMENTS.find((f) => f.id === fragment)!.points[index]!;
export const trailProgress = (index: number, elapsed: number) =>
  index === 0 ? 0.07 + elapsed / 1100 : (elapsed - 700 - index * 160) / 1450;
const contact = (trail: number, fragment: string, index: number, parameter = 1) => ({
  trail,
  fragment,
  point: vertex(fragment, index),
  parameter,
  at: trail === 0 ? (parameter - 0.07) * 1100 : 700 + trail * 160 + parameter * 1450,
});
export const CONTACTS = [
  contact(0, "N_Right_Stem", 3, 0.78),
  contact(1, "V_Center", 5),
  contact(2, "N_Diagonal", 2),
  contact(3, "M_Chevron", 0),
  contact(4, "T_Stem", 3),
  contact(5, "T_Main", 4),
  contact(6, "M_Left_Stem", 0),
];

function nearestBoundary(point: Point, polygon: readonly Point[]) {
  let nearest = polygon[0]!,
    best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!;
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy));
    const candidate = mix(a, b, t),
      gap = distance(point, candidate);
    if (gap < best) {
      nearest = candidate;
      best = gap;
    }
  }
  return { origin: nearest, distance: best };
}
export const ACTIVATIONS = FRAGMENTS.map((fragment) => {
  const trail = fragment.id.startsWith("V_")
    ? 1
    : fragment.id.startsWith("N_")
      ? 2
      : fragment.id === "M_Chevron"
        ? 3
        : fragment.id.startsWith("M_")
          ? 6
          : fragment.id === "T_Stem"
            ? 4
            : 5;
  const source = CONTACTS[trail]!;
  const { origin, distance: travel } = nearestBoundary(source.point, fragment.points);
  return {
    ...fragment,
    trail,
    origin,
    at: source.at + (travel / 2500) * 1000,
    radius: Math.max(...fragment.points.map((p) => distance(p, origin))) * 1.25,
  };
});
export function activationFrame(activation: (typeof ACTIVATIONS)[number], elapsed: number) {
  const age = elapsed - activation.at;
  const progress = ease(age / 1000);
  // The opening sweep activates this outline early; the later convergence
  // reinforces it with white fill. Neither is independent of a trail arrival.
  const firstContact = CONTACTS[0]!.at;
  const ghost =
    activation.id === "N_Right_Stem" && elapsed >= firstContact
      ? (0.12 + 0.5 * Math.sin(Math.PI * clamp((elapsed - firstContact) / 550))) * (1 - progress)
      : 0;
  return {
    progress,
    radius: activation.radius * progress,
    outline: Math.max(ghost, age > 0 && age < 900 ? Math.sin((Math.PI * age) / 900) * 0.65 : 0),
    complete: age >= 1000,
  };
}

export const shearAt = (elapsed: number) => -6 * (1 - ease((elapsed - 2700) / 1500));
export function logoToCanvas(point: Point, layout: LogoLayout, elapsed: number): Point {
  const scale = layout.width / 1874.98999;
  const offsetY = (point[1] - 244.5674 / 2) * scale;
  return [
    layout.left + point[0] * scale + offsetY * Math.tan((shearAt(elapsed) * Math.PI) / 180),
    layout.top + layout.height / 2 + offsetY,
  ];
}

/** Original Bezier + original organic vertical oscillation. */
export function originalTrailPoint(
  curve: Curve,
  t: number,
  width: number,
  height: number,
  time: number,
  depth: number,
): Point {
  const s = 1 - t,
    [a, b, c, d] = curve;
  const x = (s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0]) * width;
  let y = (s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1]) * height;
  y += Math.sin(t * Math.PI) * Math.sin(time * 0.0012 + depth) * Math.min(height * 0.025, 20);
  return [x, y];
}
export function contactedTrailPoint(
  curve: Curve,
  t: number,
  width: number,
  height: number,
  elapsed: number,
  index: number,
  layout: LogoLayout,
): Point {
  const original = originalTrailPoint(curve, t, width, height, elapsed, index);
  const contact = CONTACTS[index]!;
  const target = logoToCanvas(contact.point, layout, elapsed);
  if (index === 0) {
    const u = (t - contact.parameter) / 0.18;
    if (Math.abs(u) >= 1) return original;
    const weight = (1 + Math.cos(Math.PI * u)) / 2;
    const passing = originalTrailPoint(curve, contact.parameter, width, height, elapsed, index);
    return [
      original[0] + (target[0] - passing[0]) * weight,
      original[1] + (target[1] - passing[1]) * weight,
    ];
  }
  // Replacing just the final Bezier endpoint leaves the starting point and
  // both intermediate controls untouched. At t=1 the head meets the SVG exactly.
  return [
    original[0] + (target[0] - curve[3][0] * width) * t ** 3,
    original[1] + (target[1] - curve[3][1] * height) * t ** 3,
  ];
}
