import { describe, expect, it } from "vitest";
import { sampleFinalIllumination } from "@/lib/vtmn/visual-identity";
import { T } from "@/lib/vtmn/timeline";

describe("final charge returning to graphite", () => {
  it("does not apply final illumination during approved construction", () => {
    const out = { charge: 0, resting: 0 };
    for (const t of [0, 1.5, 5.5, 8.2, T.LOCK, T.SURGE]) {
      sampleFinalIllumination(t, out);
      expect(out).toEqual({ charge: 0, resting: 0 });
    }
  });
  it("peaks during the existing electrical climax then holds a stable metallic resting state", () => {
    const out = { charge: 0, resting: 0 };
    sampleFinalIllumination(12.9, out);
    expect(out.charge).toBeGreaterThan(0.95);
    for (const t of [13.85, 14, T.TRANSITION, T.END, 30]) {
      sampleFinalIllumination(t, out);
      expect(out).toEqual({ charge: 0, resting: 1 });
    }
  });
  it("remains bounded and continuous through the final charge and settle", () => {
    const out = { charge: 0, resting: 0 };
    let previousCharge = 0,
      previousResting = 0;
    for (let t = 0; t <= T.END; t += 0.005) {
      sampleFinalIllumination(t, out);
      expect(out.charge).toBeGreaterThanOrEqual(0);
      expect(out.charge).toBeLessThanOrEqual(1);
      expect(out.resting).toBeGreaterThanOrEqual(previousResting);
      expect(out.resting).toBeLessThanOrEqual(1);
      expect(Math.abs(out.charge - previousCharge)).toBeLessThan(0.02);
      expect(out.resting - previousResting).toBeLessThan(0.02);
      previousCharge = out.charge;
      previousResting = out.resting;
    }
  });
});
