import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createReflectiveFloor, FLOOR_Y } from "@/components/vtmn/reflective-floor";
import { cameraRig, T } from "@/lib/vtmn/timeline";
import { applyCameraOrbit, cameraOrbitScratch } from "@/components/vtmn/camera-orbit";
import { buildWordmark, CELL } from "@/lib/vtmn/glyphs";
import { createCubeInstances, createWordmarkStage } from "@/components/vtmn/cube-instances";

describe("live planar environment", () => {
  it("captures the actual scene from a floor-mirrored camera and restores render state", () => {
    const floor = createReflectiveFloor(256),
      scene = new THREE.Scene();
    const subject = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    subject.position.set(4, 2, 3);
    scene.add(subject, floor);
    // A material-only depth sample keeps real wordmark reflections strong
    // while attenuating the far sky, without a second capture/render pass.
    const capture = floor.getRenderTarget();
    expect(capture.depthTexture).toBeInstanceOf(THREE.DepthTexture);
    expect(capture.depthTexture!.image.width).toBe(256);
    expect(capture.depthTexture!.image.height).toBe(256);
    expect(capture.resolveDepthBuffer).toBe(true);
    expect(floor.material.uniforms["tDepth"]!.value).toBe(capture.depthTexture);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 1200);
    camera.position.set(25, 12, 90);
    camera.lookAt(0, -2, 0);
    camera.rotateZ(0.03);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const oldTarget = new THREE.WebGLRenderTarget(16, 16);
    let target = oldTarget,
      captured: THREE.Camera | undefined;
    // Only the GPU boundary is replaced; the real Reflector computes all poses,
    // clipping and projective texture transforms.
    const renderer = {
      xr: { enabled: false },
      shadowMap: { autoUpdate: true },
      autoClear: true,
      getRenderTarget: () => target,
      setRenderTarget: (next: THREE.WebGLRenderTarget) => {
        target = next;
      },
      state: { buffers: { depth: { setMask: () => {} } } },
      render: (renderedScene: THREE.Scene, virtual: THREE.Camera) => {
        expect(renderedScene).toBe(scene);
        expect(floor.visible).toBe(false);
        expect(target).toBe(floor.getRenderTarget());
        captured = virtual;
      },
    } as unknown as THREE.WebGLRenderer;
    floor.onBeforeRender(
      renderer,
      scene,
      camera,
      floor.geometry,
      floor.material,
      new THREE.Group(),
    );
    expect(captured).toBeDefined();
    const virtual = captured!;
    // Reflection depth uses an oblique projection. The material must receive
    // that actual camera's inverse matrix to recover height above the floor.
    const inverseBinding = floor.material.uniforms["reflectionInverseViewProjection"];
    expect(inverseBinding?.value).toBeInstanceOf(THREE.Matrix4);
    const projectedSubject = new THREE.Vector3(4, 2, 3).project(virtual);
    const recovered = new THREE.Vector4(
      projectedSubject.x,
      projectedSubject.y,
      projectedSubject.z,
      1,
    ).applyMatrix4(inverseBinding!.value as THREE.Matrix4);
    recovered.multiplyScalar(1 / recovered.w);
    expect(recovered.x).toBeCloseTo(4, 7);
    expect(recovered.y).toBeCloseTo(2, 7);
    expect(recovered.z).toBeCloseTo(3, 7);
    expect(recovered.y - FLOOR_Y).toBeCloseTo(13, 7);
    expect(virtual.position.x).toBeCloseTo(25, 8);
    expect(virtual.position.y).toBeCloseTo(2 * FLOOR_Y - 12, 8);
    expect(virtual.position.z).toBeCloseTo(90, 8);
    const normal = camera.getWorldDirection(new THREE.Vector3());
    normal.y *= -1;
    expect(virtual.getWorldDirection(new THREE.Vector3()).dot(normal)).toBeCloseTo(1, 8);
    expect(target).toBe(oldTarget);
    expect(floor.visible).toBe(true);
    expect(renderer.shadowMap.autoUpdate).toBe(true);
    expect(subject.position.toArray()).toEqual([4, 2, 3]);
    expect(floor.children).toHaveLength(0);
    const reflected = new THREE.Vector3(4, 2, 3).project(virtual);
    expect(Math.abs(reflected.x)).toBeLessThan(1);
    expect(Math.abs(reflected.y)).toBeLessThan(1);
    expect(reflected.z).toBeGreaterThan(-1);
    expect(reflected.z).toBeLessThan(1);
    expect(new THREE.Vector3(0, FLOOR_Y - 1, 0).project(virtual).z).toBeLessThan(-1);
    oldTarget.dispose();
    floor.geometry.dispose();
    floor.dispose();
    subject.geometry.dispose();
    (subject.material as THREE.Material).dispose();
  });
  it("clears every active cube and the entire camera flight above the fixed floor", () => {
    const cubes = createCubeInstances(buildWordmark()),
      rig = cameraRig(16 / 9);
    const camera = new THREE.PerspectiveCamera(),
      scratch = cameraOrbitScratch();
    const matrix = new THREE.Matrix4();
    createWordmarkStage(cubes.mesh);
    cubes.geo.computeBoundingBox();
    const half = cubes.geo.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    let minCubeY = Infinity,
      minEyeY = Infinity;
    for (let t = 0; t <= T.LOCK + 0.05; t += 0.05) {
      cubes.update(t);
      applyCameraOrbit(camera, rig, t, scratch);
      minEyeY = Math.min(minEyeY, camera.position.y);
      for (let i = 0; i < cubes.mesh.count; i++) {
        if (!cubes.presence.getX(i)) continue;
        cubes.mesh.getMatrixAt(i, matrix);
        matrix.premultiply(cubes.mesh.matrixWorld);
        const m = matrix.elements;
        minCubeY = Math.min(
          minCubeY,
          m[13]! - (half.x * Math.abs(m[1]!) + half.y * Math.abs(m[5]!) + half.z * Math.abs(m[9]!)),
        );
      }
    }
    expect(minCubeY).toBeGreaterThan(FLOOR_Y + 0.05);
    expect(minEyeY).toBeGreaterThan(FLOOR_Y + 2);
    cubes.dispose();
  });
  it.each([0.42, 0.75, 1, 16 / 9, 2.4])(
    "frames the final real mark and its complete reflection at aspect %s",
    (aspect) => {
      const cubes = createCubeInstances(buildWordmark()),
        rig = cameraRig(aspect);
      const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 1200);
      applyCameraOrbit(camera, rig, T.REVEAL, cameraOrbitScratch());
      cubes.update(T.REVEAL);
      createWordmarkStage(cubes.mesh);
      cubes.geo.computeBoundingBox();
      const half = cubes.geo.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      const matrix = new THREE.Matrix4(),
        corner = new THREE.Vector3(),
        reflected = new THREE.Vector3();
      let worst = 0;
      for (let i = 0; i < cubes.mesh.count; i++) {
        cubes.mesh.getMatrixAt(i, matrix);
        for (const x of [-half.x, half.x])
          for (const y of [-half.y, half.y])
            for (const z of [-half.z, half.z]) {
              corner.set(x, y, z).applyMatrix4(matrix).applyMatrix4(cubes.mesh.matrixWorld);
              reflected.copy(corner);
              reflected.y = 2 * FLOOR_Y - reflected.y;
              corner.project(camera);
              reflected.project(camera);
              worst = Math.max(
                worst,
                Math.abs(corner.x),
                Math.abs(corner.y),
                Math.abs(reflected.x),
                Math.abs(reflected.y),
              );
            }
      }
      cubes.dispose();
      expect(worst).toBeLessThan(0.99);
    },
  );
});
