import { describe, expect, it } from "vitest";
import { buildWordmark } from "@/lib/vtmn/glyphs";
import { materializationPlan, materializationAt } from "@/lib/vtmn/materialization";
import { localArcAllowed, MAX_LOCAL_ARC } from "@/lib/vtmn/connections";
import { T, cameraRig, orbitAngle, sampleCamera } from "@/lib/vtmn/timeline";

const wm = buildWordmark();
describe("per-instance electrical materialization", () => {
  it("keeps every dormant instance completely absent and emits energy before any geometry", () => {
    for (const cell of wm.cells) {
      const plan = materializationPlan(cell, wm.chunks[cell.chunk]!);
      const dormant = materializationAt(plan, plan.ignite - 0.001);
      expect(dormant).toMatchObject({
        present: false,
        growth: 0,
        matter: 0,
        travel: 0,
        ignition: 0,
      });
      const ignition = materializationAt(plan, plan.ignite + 0.025);
      expect(ignition.present).toBe(true);
      expect(ignition.ignition).toBeGreaterThan(0.5);
      expect(ignition.growth).toBe(0);
      expect(ignition.matter).toBe(0);
    }
  });
  it("grows an electrical shell before solid matter and retains original locking times", () => {
    for (const cell of wm.cells) {
      const ch = wm.chunks[cell.chunk]!,
        plan = materializationPlan(cell, ch);
      const shell = materializationAt(plan, plan.shell + 0.025);
      expect(shell.growth).toBeGreaterThan(0);
      expect(shell.growth).toBeLessThan(1);
      expect(shell.matter).toBe(0);
      expect(shell.travel).toBe(0);
      const launch = materializationAt(plan, plan.launch);
      expect(launch.growth).toBeGreaterThan(0.8);
      expect(launch.matter).toBeGreaterThan(0.7);
      expect(launch.travel).toBe(0);
      const lock = materializationAt(plan, ch.tArrive);
      expect(lock).toMatchObject({ present: true, growth: 1, matter: 1, travel: 1 });
      expect(plan.arrive).toBe(ch.tArrive);
    }
  });
  it("has independently varied formation timings across physical depth layers", () => {
    const plans = wm.cells.slice(0, 30).map((c) => materializationPlan(c, wm.chunks[c.chunk]!));
    expect(new Set(plans.map((p) => p.solid - p.shell)).size).toBeGreaterThan(10);
    expect(new Set(plans.slice(0, 3).map((p) => p.ignite)).size).toBe(3);
    expect(
      plans.every((p) => p.ignite < p.shell && p.shell < p.launch && p.launch < p.arrive),
    ).toBe(true);
    for (let t = -1; t <= 16; t += 0.02) {
      const state = materializationAt(plans[0]!, t);
      expect(
        [state.growth, state.matter, state.travel, state.ignition].every(Number.isFinite),
      ).toBe(true);
      expect(state.growth).toBeGreaterThanOrEqual(0);
      expect(state.growth).toBeLessThanOrEqual(1);
    }
  });
});

describe("strictly localized electrical arcs", () => {
  it("rejects inter-letter, dormant and distant endpoints even during a surge", () => {
    const chunks = [{ letter: 0 }, { letter: 0 }, { letter: 1 }];
    const positions = new Float32Array([0, 0, 0, 0.32, 0, 0, 0.64, 0, 0]);
    const active = new Float32Array([1, 1, 1]);
    expect(localArcAllowed(chunks, positions, active, 0, 1)).toBe(true);
    expect(localArcAllowed(chunks, positions, active, 0, 2)).toBe(false);
    active[1] = 0;
    expect(localArcAllowed(chunks, positions, active, 0, 1)).toBe(false);
    active[1] = 1;
    positions[3] = MAX_LOCAL_ARC + 0.01;
    expect(localArcAllowed(chunks, positions, active, 0, 1)).toBe(false);
  });
});

describe("continuous physical orbit", () => {
  it("travels exactly one revolution without an intermediate angular stop", () => {
    let previous = -1;
    const rig = cameraRig(16 / 9);
    for (let t = 0; t <= T.LOCK; t += 0.01) {
      const angle = orbitAngle(t);
      expect(angle).toBeGreaterThan(previous);
      const c = sampleCamera(rig, t);
      const measured = Math.atan2(c.pos[0] - rig.pivot[0], c.pos[2] - rig.pivot[2]);
      expect(Math.sin(measured - angle)).toBeCloseTo(0, 7);
      expect(Math.hypot(c.pos[0], c.pos[2])).toBeGreaterThan(50);
      previous = angle;
    }
    expect(orbitAngle(0)).toBe(0);
    expect(orbitAngle(T.LOCK)).toBeCloseTo(2 * Math.PI, 12);
    expect(orbitAngle(20)).toBe(orbitAngle(T.LOCK));
    for (const t of [1, 2.8, 4, 5.6, 7, 8.3, 10])
      expect(orbitAngle(t + 0.001) - orbitAngle(t)).toBeGreaterThan(0);
    expect(sampleCamera(rig, T.REVEAL)).toEqual(sampleCamera(rig, T.END));
    expect(sampleCamera(rig, T.LOCK).pos[2]).toBeGreaterThanOrEqual(
      sampleCamera(rig, T.REVEAL).pos[2],
    );
  });
  it("shows real side and rear positions while construction remains active", () => {
    const rig = cameraRig(16 / 9);
    expect(sampleCamera(rig, 2.8).pos[0]).toBeGreaterThan(50);
    expect(sampleCamera(rig, 5.6).pos[2]).toBeLessThan(-50);
    expect(sampleCamera(rig, 8.3).pos[0]).toBeLessThan(-50);
    const front = sampleCamera(rig, T.LOCK);
    expect(front.pos[0]).toBe(0);
    expect(front.pos[1]).toBeGreaterThan(0);
    expect(front.pos[2]).toBeGreaterThan(50);
    expect(orbitAngle(T.LOCK) - orbitAngle(T.LOCK - 0.001)).toBeLessThan(0.000001);
  });
});
