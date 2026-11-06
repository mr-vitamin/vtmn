import { describe, expect, it } from "vitest";
import { buildWordmark, CELL, containsPoint, FRAGMENTS } from "@/lib/vtmn/glyphs";
import {
  cameraRig,
  sampleCamera,
  PHASES,
  T,
  cubeState,
  surgeAt,
  inspectionOptions,
} from "@/lib/vtmn/timeline";
import { TOTAL_W, H } from "@/lib/vtmn/brand";

describe("Electric Genesis geometry and conduction", () => {
  const wm = buildWordmark();
  it("preserves all eleven official fragments as separate cubic silhouettes", () => {
    expect(FRAGMENTS).toHaveLength(11);
    expect(wm.cells.length).toBeGreaterThan(2000);
    for (const cell of wm.cells) {
      const ch = wm.chunks[cell.chunk]!;
      const f = FRAGMENTS[ch.fragment]!;
      for (const dx of [-CELL * 0.46, CELL * 0.46])
        for (const dy of [-CELL * 0.46, CELL * 0.46])
          expect(containsPoint(cell.x + dx, cell.y + dy, f.poly)).toBe(true);
    }
    expect(new Set(wm.chunks.map((c) => c.fragment)).size).toBe(11);
  });
  it("is repeatable and every energized cube has an earlier connected parent", () => {
    expect(buildWordmark()).toEqual(wm);
    for (let li = 0; li < 4; li++) {
      const letter = wm.chunks.filter((c) => c.letter === li);
      expect(letter.filter((c) => c.parent < 0)).toHaveLength(1);
      for (const ch of letter) {
        expect(ch.tActivate).toBeGreaterThanOrEqual(PHASES[li]!.start);
        expect(ch.tArrive).toBeLessThanOrEqual(PHASES[li]!.end + 0.00001);
        if (ch.parent >= 0) {
          const parent = wm.chunks[ch.parent]!;
          expect(parent.letter).toBe(li);
          expect(parent.tActivate).toBeLessThan(ch.tActivate);
          expect(ch.neighbors).toContain(ch.parent);
        }
      }
    }
  });
  it("progresses V -> T -> M -> N and sustains earlier letters", () => {
    const ends = PHASES.map((_, li) =>
      Math.max(...wm.chunks.filter((c) => c.letter === li).map((c) => c.tArrive)),
    );
    expect(ends[0]).toBeLessThan(ends[1]!);
    expect(ends[1]).toBeLessThan(ends[2]!);
    expect(ends[2]).toBeLessThan(ends[3]!);
    expect(ends[3]).toBeLessThan(T.SURGE);
    for (const ch of wm.chunks) {
      const state = cubeState(ch, 13.8);
      expect(state.progress).toBe(1);
      expect(state.energy).toBeGreaterThan(0);
      expect(state.white).toBeGreaterThan(0.8);
      expect(cubeState(ch, -1).progress).toBe(0);
    }
    expect(ends[3]! - PHASES[3]!.start).toBeGreaterThan(2.5);
  });
  it("drives a spatial reverse surge then a left to right sweep", () => {
    expect(surgeAt(TOTAL_W / 2, 11.25)).toBeGreaterThan(surgeAt(-TOTAL_W / 2, 11.25));
    expect(surgeAt(-TOTAL_W / 2, 12.05)).toBeGreaterThan(surgeAt(TOTAL_W / 2, 12.05));
    expect(surgeAt(TOTAL_W / 2, 13)).toBeGreaterThan(surgeAt(-TOTAL_W / 2, 13));
  });
});

describe("Electric Genesis camera and inspection", () => {
  it.each([0.42, 0.75, 1, 16 / 9, 2.4])(
    "fits the final mark with margin at aspect %s",
    (aspect) => {
      const keys = cameraRig(aspect);
      for (const t of [0, 2, 4, 7, 9.5, 11.3, 13.8, T.END]) {
        const c = sampleCamera(keys, t);
        expect([...c.pos, ...c.look, c.fov].every(Number.isFinite)).toBe(true);
      }
      const c = sampleCamera(keys, 13.8);
      expect(c.pos[0]).toBe(0);
      expect(c.pos[1]).toBeGreaterThan(0);
      const halfY = (c.pos[2] - c.look[2]) * Math.tan((c.fov * Math.PI) / 360);
      expect(halfY * aspect).toBeGreaterThan(TOTAL_W * 0.54);
      expect(halfY).toBeGreaterThan(H * 0.6);
      expect(sampleCamera(keys, T.END)).toEqual(c);
    },
  );
  it("freezes exactly at a bounded requested phase and rejects invalid timestamps", () => {
    expect(inspectionOptions("?t=7.25&hold")).toEqual({ startAt: 7.25, hold: true });
    expect(inspectionOptions("?t=Infinity&hold").startAt).toBe(0);
    expect(inspectionOptions("?t=-12").startAt).toBe(0);
    expect(inspectionOptions("?t=999").startAt).toBe(T.END);
  });
});
