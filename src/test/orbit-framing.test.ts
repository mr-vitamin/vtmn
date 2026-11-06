import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { cameraRig, sampleCamera, orbitAngle, T } from "@/lib/vtmn/timeline";
import { buildWordmark, CELL } from "@/lib/vtmn/glyphs";
import { createCubeInstances, createWordmarkStage } from "@/components/vtmn/cube-instances";
import { applyCameraOrbit, cameraOrbitScratch } from "@/components/vtmn/camera-orbit";
import { scaleFramingPadding } from "@/lib/vtmn/scale";

describe("perspective-safe smooth orbit", () => {
  it.each([0.42, 0.75, 16 / 9])(
    "has continuous camera velocity through side and rear crossings at aspect %s",
    (aspect) => {
      const rig = cameraRig(aspect),
        h = 0.0001;
      for (const t of [0.35, 2.8375, 5.5, 8.1625, T.LOCK - 0.65, T.LOCK]) {
        const a = sampleCamera(rig, t - h),
          b = sampleCamera(rig, t),
          c = sampleCamera(rig, t + h);
        for (let axis = 0; axis < 3; axis++) {
          const before = (b.pos[axis]! - a.pos[axis]!) / h,
            after = (c.pos[axis]! - b.pos[axis]!) / h;
          expect(Math.abs(after - before)).toBeLessThan(0.1);
        }
      }
    },
  );
  it.each([0.42, 16 / 9, 1.85, 1.9, 2, 2.1, 2.2, 2.4])(
    "keeps actual active cube corners inside the viewport during the orbit at aspect %s",
    (aspect) => {
      const wm = buildWordmark(),
        cubes = createCubeInstances(wm),
        rig = cameraRig(aspect);
      const cam = new THREE.PerspectiveCamera(36, aspect, 0.1, 1200),
        matrix = new THREE.Matrix4(),
        point = new THREE.Vector3();
      createWordmarkStage(cubes.mesh);
      cubes.geo.computeBoundingBox();
      const half = cubes.geo.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      let worst = 0,
        minZ = Infinity,
        maxZ = -Infinity;
      const scratch = cameraOrbitScratch();
      for (let t = 0.1; t <= T.LOCK; t += 0.1) {
        applyCameraOrbit(cam, rig, t, scratch, scaleFramingPadding(aspect, t));
        cubes.update(t);
        for (let i = 0; i < wm.cells.length; i++) {
          if (!cubes.presence.getX(i)) continue;
          cubes.mesh.getMatrixAt(i, matrix);
          for (const x of [-half.x, half.x])
            for (const y of [-half.y, half.y])
              for (const z of [-half.z, half.z]) {
                point
                  .set(x, y, z)
                  .applyMatrix4(matrix)
                  .applyMatrix4(cubes.mesh.matrixWorld)
                  .project(cam);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
                worst = Math.max(worst, Math.abs(point.x), Math.abs(point.y));
              }
        }
      }
      cubes.dispose();
      expect(worst).toBeLessThan(0.99);
      expect(minZ).toBeGreaterThan(-1);
      expect(maxZ).toBeLessThan(1);
    },
  );
});
