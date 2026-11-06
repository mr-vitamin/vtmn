import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { cameraRig, sampleCamera, orbitAngle, T } from "@/lib/vtmn/timeline";
import { applyCameraOrbit, cameraOrbitScratch } from "@/components/vtmn/camera-orbit";
import { buildWordmark } from "@/lib/vtmn/glyphs";
import { createCubeInstances, createWordmarkStage } from "@/components/vtmn/cube-instances";

function timeAtAngle(angle: number) {
  let a = 0,
    b = T.LOCK;
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    if (orbitAngle(mid) < angle) a = mid;
    else b = mid;
  }
  return angle === 0 ? 0 : angle === Math.PI * 2 ? T.LOCK : (a + b) / 2;
}
const checkpoints = Array.from({ length: 9 }, (_, i) => timeAtAngle((i * Math.PI) / 4));
describe("cinematic world-space camera flight", () => {
  it("varies altitude and distance with low opening, elevated rise and close opposite-side pass", () => {
    const rig = cameraRig(16 / 9);
    const samples = checkpoints.map((t) => sampleCamera(rig, t));
    const radii = samples.map((c) => Math.hypot(c.pos[0], c.pos[2] + 0.32));
    expect(samples[0]!.pos[1]).toBeLessThan(0);
    expect(samples[2]!.pos[1]).toBeGreaterThan(20);
    expect(samples[6]!.pos[1]).toBeLessThan(0);
    expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.35);
    expect(radii[6]).toBeLessThan(radii[4]! * 0.8);
    expect(radii[8]).toBeGreaterThan(radii[6]!);
    expect(samples[8]!.look[1]).toBeLessThan(-6);
  });
  it("places the actual camera at nine orbital quadrants with continuous aim and restrained bank", () => {
    const rig = cameraRig(16 / 9),
      camera = new THREE.PerspectiveCamera(),
      scratch = cameraOrbitScratch();
    const world = new THREE.Vector3(),
      direction = new THREE.Vector3(),
      toward = new THREE.Vector3();
    checkpoints.forEach((t, i) => {
      applyCameraOrbit(camera, rig, t, scratch);
      camera.getWorldPosition(world);
      const angle = Math.atan2(world.x, world.z + 0.32);
      expect(Math.cos(angle - (i * Math.PI) / 4)).toBeCloseTo(1, 9);
      toward.fromArray(sampleCamera(rig, t).look).sub(world).normalize();
      camera.getWorldDirection(direction);
      expect(direction.dot(toward)).toBeCloseTo(1, 9);
    });
    let previous = new THREE.Quaternion();
    applyCameraOrbit(camera, rig, 0, scratch);
    camera.getWorldQuaternion(previous);
    for (let t = 0.01; t < T.REVEAL; t += 0.01) {
      applyCameraOrbit(camera, rig, t, scratch);
      const q = camera.getWorldQuaternion(new THREE.Quaternion());
      expect(q.angleTo(previous)).toBeLessThan(0.025);
      previous = q;
    }
  });
  it("applies world-space positions even when the camera has a transformed parent", () => {
    const rig = cameraRig(16 / 9),
      parent = new THREE.Group(),
      camera = new THREE.PerspectiveCamera();
    parent.position.set(11, -3, 7);
    parent.rotation.set(0.1, 0.4, -0.1);
    parent.scale.setScalar(1.4);
    parent.add(camera);
    const scratch = cameraOrbitScratch(),
      world = new THREE.Vector3(),
      toward = new THREE.Vector3(),
      direction = new THREE.Vector3();
    for (const t of checkpoints) {
      applyCameraOrbit(camera, rig, t, scratch);
      expect(
        camera.getWorldPosition(world).distanceTo(new THREE.Vector3(...sampleCamera(rig, t).pos)),
      ).toBeLessThan(0.000001);
      toward.fromArray(sampleCamera(rig, t).look).sub(world).normalize();
      camera.getWorldDirection(direction);
      expect(direction.dot(toward)).toBeCloseTo(1, 8);
    }
  });
  it("keeps root and scene transforms fixed, with every completed cube anchored while the camera moves", () => {
    const wm = buildWordmark(),
      cubes = createCubeInstances(wm),
      scene = new THREE.Scene();
    const stage = createWordmarkStage(cubes.mesh);
    scene.add(stage);
    const camera = new THREE.PerspectiveCamera(),
      rig = cameraRig(16 / 9),
      scratch = cameraOrbitScratch();
    const identity = new THREE.Matrix4(),
      instance = new THREE.Matrix4(),
      point = new THREE.Vector3();
    for (const t of checkpoints) {
      cubes.update(t);
      applyCameraOrbit(camera, rig, t, scratch);
      scene.updateMatrixWorld(true);
      expect(cubes.mesh.matrixWorld.equals(new THREE.Matrix4().makeScale(1.15, 1.15, 1.15))).toBe(
        true,
      );
      expect(stage.position.toArray()).toEqual([0, 0, 0]);
      expect(stage.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(scene.matrixWorld.equals(identity)).toBe(true);
      expect(cubes.mesh.position.toArray()).toEqual([0, 0, 0]);
      expect(cubes.mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(cubes.mesh.scale.toArray()).toEqual([1, 1, 1]);
      for (let i = 0; i < wm.cells.length; i++) {
        const cell = wm.cells[i]!;
        if (t < wm.chunks[cell.chunk]!.tArrive) continue;
        cubes.mesh.getMatrixAt(i, instance);
        point.setFromMatrixPosition(instance).applyMatrix4(cubes.mesh.matrixWorld);
        expect(point.x).toBeCloseTo(cell.x * 1.15, 5);
        expect(point.y).toBeCloseTo(cell.y * 1.15, 5);
        expect(point.z).toBeCloseTo(cell.z * 1.15, 5);
      }
    }
    cubes.dispose();
  });
});
