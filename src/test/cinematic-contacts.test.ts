import { describe, expect, it } from "vitest";
import {
  ACTIVATIONS,
  CONTACTS,
  activationFrame,
  contactedTrailPoint,
  logoToCanvas,
  originalTrailPoint,
  trailProgress,
  type LogoLayout,
} from "@/lib/cinematic-contacts";
import { CINEMATIC_PATHS } from "@/lib/cinematic-intro";

const layouts = [
  { viewport: [1920, 1080], logo: { left: 390, top: 393, width: 1140, height: 250.8 } },
  { viewport: [375, 812], logo: { left: 18.75, top: 352.635, width: 337.5, height: 74.25 } },
  { viewport: [667, 375], logo: { left: 155.375, top: 122.0625, width: 356.25, height: 78.375 } },
] as const;
describe("Cinematic trail contacts", () => {
  it.each(layouts)(
    "pins actual moving trail heads to approved geometry at viewport $viewport",
    ({ viewport, logo }) => {
      for (const event of CONTACTS) {
        const progress = trailProgress(event.trail, event.at);
        expect(progress).toBeCloseTo(event.parameter, 12);
        const head = contactedTrailPoint(
          CINEMATIC_PATHS[event.trail]!,
          event.parameter,
          viewport[0],
          viewport[1],
          event.at,
          event.trail,
          logo,
        );
        const target = logoToCanvas(event.point, logo, event.at);
        expect(head[0]).toBeCloseTo(target[0], 9);
        expect(head[1]).toBeCloseTo(target[1], 9);
      }
    },
  );
  it("maps the official SVG center and animated skew into the original outer viewport fit", () => {
    const logo: LogoLayout = { left: 390, top: 393, width: 1140, height: 250.8 };
    const center = logoToCanvas([937.494995, 122.2837], logo, 0);
    expect(center[0]).toBeCloseTo(960, 9);
    expect(center[1]).toBeCloseTo(518.4, 9);
    // Skew is zero at completion; top-left is centered vertically within 1000x220.
    const origin = logoToCanvas([0, 0], logo, 4500);
    expect(origin[0]).toBe(390);
    expect(origin[1]).toBeCloseTo(444.051113476078, 8);
  });
  it("preserves the opening sweep away from its short passing-contact interval", () => {
    const curve = CINEMATIC_PATHS[0]!,
      logo = layouts[0]!.logo;
    for (const t of [0, 0.2, 0.59, 0.97, 1]) {
      expect(contactedTrailPoint(curve, t, 1920, 1080, 700, 0, logo)).toEqual(
        originalTrailPoint(curve, t, 1920, 1080, 700, 0),
      );
    }
    for (const t of [0.6, 0.96]) {
      const a = contactedTrailPoint(curve, t - 1e-7, 1920, 1080, 700, 0, logo);
      const b = contactedTrailPoint(curve, t + 1e-7, 1920, 1080, 700, 0, logo);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.01);
    }
  });
  it("keeps each convergence curve's original start and modifies only its endpoint contribution", () => {
    for (let index = 1; index < 7; index++) {
      const curve = CINEMATIC_PATHS[index]!,
        event = CONTACTS[index]!,
        logo = layouts[0]!.logo;
      expect(contactedTrailPoint(curve, 0, 1920, 1080, 0, index, logo)).toEqual([
        curve[0][0] * 1920,
        curve[0][1] * 1080,
      ]);
      const original = originalTrailPoint(curve, 0.5, 1920, 1080, event.at, index);
      const revised = contactedTrailPoint(curve, 0.5, 1920, 1080, event.at, index, logo);
      const target = logoToCanvas(event.point, logo, event.at);
      expect(revised[0] - original[0]).toBeCloseTo((target[0] - curve[3][0] * 1920) * 0.125, 9);
      expect(revised[1] - original[1]).toBeCloseTo((target[1] - curve[3][1] * 1080) * 0.125, 9);
    }
  });
  it.each(ACTIVATIONS)(
    "reveals $id only after contact/physical propagation and resolves to a clean final state",
    (activation) => {
      expect(activation.at).toBeGreaterThanOrEqual(CONTACTS[activation.trail]!.at);
      expect(activationFrame(activation, activation.at - 1).radius).toBe(0);
      expect(activationFrame(activation, activation.at).radius).toBe(0);
      expect(activationFrame(activation, activation.at + 500).progress).toBe(0.5);
      expect(activationFrame(activation, 4500)).toEqual({
        progress: 1,
        radius: activation.radius,
        outline: 0,
        complete: true,
      });
      expect(activation.at + 1000).toBeLessThan(4500);
    },
  );
  it("lets the opening sweep activate the N outline before the later convergence starts its white reveal", () => {
    const n = ACTIVATIONS.find((f) => f.id === "N_Right_Stem")!;
    expect(activationFrame(n, 780).outline).toBe(0);
    expect(activationFrame(n, 1000).outline).toBeGreaterThan(0);
    expect(activationFrame(n, 1000).radius).toBe(0);
    expect(activationFrame(n, 3000).progress).toBeGreaterThan(0);
    const overlapping = ACTIVATIONS.filter((f) => {
      const p = activationFrame(f, 3200).progress;
      return p > 0 && p < 1;
    });
    expect(new Set(overlapping.map((f) => f.id[0])).size).toBe(4);
  });
});
