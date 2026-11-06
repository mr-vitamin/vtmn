import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildWordmark } from "@/lib/vtmn/glyphs";
import { createCubeInstances } from "@/components/vtmn/cube-instances";

const wm = buildWordmark();
describe("instanced materialization rendering contract", () => {
  it("removes every dormant instance from geometry and illumination at every phase", () => {
    const cubes = createCubeInstances(wm),
      matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3();
    for (const t of [0, 0.145, 1.6, 3.4, 5.3, 8.3]) {
      cubes.update(t);
      for (let i = 0; i < wm.cells.length; i++) {
        if (t >= cubes.plans[i]!.ignite) continue;
        cubes.mesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        expect(scale.lengthSq()).toBe(0);
        expect(cubes.presence.getX(i)).toBe(0);
        expect(cubes.energy.getX(i)).toBe(0);
      }
    }
    expect(cubes.mesh.castShadow).toBe(false);
    cubes.dispose();
  });
  it("physically grows each cube and returns exactly to its approved destination", () => {
    const cubes = createCubeInstances(wm),
      matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3(),
      position = new THREE.Vector3();
    const plan = cubes.plans[0]!;
    cubes.update(plan.ignite + 0.025);
    cubes.mesh.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    expect(scale.lengthSq()).toBe(0);
    expect(cubes.appearance[0]!.ignition).toBeGreaterThan(0.5);
    cubes.update((plan.shell + plan.solid) / 2);
    cubes.mesh.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    expect(scale.x).toBeGreaterThan(0);
    expect(scale.x).toBeLessThan(1);
    cubes.update(13.9);
    for (let i = 0; i < wm.cells.length; i++) {
      const cell = wm.cells[i]!;
      cubes.mesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      scale.setFromMatrixScale(matrix);
      expect(position.x).toBeCloseTo(cell.x, 5);
      expect(position.y).toBeCloseTo(cell.y, 5);
      expect(position.z).toBeCloseTo(cell.z, 5);
      expect(scale.x).toBeCloseTo(1, 5);
      expect(scale.z).toBeCloseTo(cell.sz, 5);
      expect(cubes.matter.getX(i)).toBe(1);
    }
    expect(cubes.depthOrigins.some((z) => z > 1)).toBe(true);
    expect(cubes.depthOrigins.some((z) => z < -1)).toBe(true);
    cubes.dispose();
  });
});
