import { StrictMode } from "react";
import { act, createRoot, extend } from "@react-three/fiber";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { WordmarkStage } from "@/components/vtmn/IntroScene";
import { StaticEnvironment } from "@/components/vtmn/StaticEnvironment";
import { buildWordmark } from "@/lib/vtmn/glyphs";
import { createCubeInstances } from "@/components/vtmn/cube-instances";

extend({ Group: THREE.Group });
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => {
  if (previousActEnvironment === undefined) delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  else actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});
// The real React/R3F lifecycle and Three scene graph run here. Only the GPU
// boundary is replaced; this test does not claim shader/pixel validation.
function rendererBoundary(canvas: HTMLCanvasElement) {
  return {
    domElement: canvas,
    render() {},
    setPixelRatio() {},
    setSize() {},
    shadowMap: {},
    xr: {
      enabled: false,
      isPresenting: false,
      addEventListener() {},
      removeEventListener() {},
      setAnimationLoop() {},
    },
  } as unknown as THREE.WebGLRenderer;
}

describe("production wordmark stage mounting", () => {
  it.each([false, true])(
    "keeps active geometry and all electrical objects in the committed scene (StrictMode=%s)",
    async (strict) => {
      const cubes = createCubeInstances(buildWordmark());
      const arcs = new THREE.LineSegments(),
        sparks = new THREE.Points();
      const lights = Array.from({ length: 4 }, () => new THREE.PointLight());
      const objects = [cubes.mesh, arcs, sparks, ...lights];
      const scene = new THREE.Scene();
      const root = createRoot(document.createElement("canvas"));
      await root.configure({
        gl: rendererBoundary(document.createElement("canvas")),
        scene,
        frameloop: "never",
        dpr: 1,
        size: { width: 1280, height: 720, top: 0, left: 0 },
      });
      const content = (
        <>
          <StaticEnvironment charge={cubes.material.u.uFinalCharge} />
          <WordmarkStage objects={objects} />
        </>
      );
      try {
        await act(async () => {
          root.render(strict ? <StrictMode>{content}</StrictMode> : content);
        });
        const stage = scene.getObjectByName("VTMNMonument")!;
        expect(stage).toBeDefined();
        const floor = scene.getObjectByName("CinematicObsidianFloor")!;
        const sky = scene.getObjectByName("VTMNPlasmaAtmosphere") as THREE.Mesh;
        expect(floor).toBeDefined();
        expect(sky).toBeDefined();
        expect(floor.parent).toBe(scene);
        expect(sky.parent).toBe(scene);
        expect(sky.position.toArray()).toEqual([0, 0, 0]);
        expect(sky.quaternion.toArray()).toEqual([0, 0, 0, 1]);
        expect((sky.material as THREE.Material).depthWrite).toBe(false);
        expect((sky.material as THREE.Material).side).toBe(THREE.BackSide);
        expect((sky.material as THREE.ShaderMaterial).uniforms["uCharge"]).toBe(
          cubes.material.u.uFinalCharge,
        );
        expect(stage.children).toHaveLength(7);
        expect(scene.getObjectByName("ElectricGenesisCubes")).toBe(cubes.mesh);
        for (const object of objects) expect(object.parent).toBe(stage);
        expect(stage.position.toArray()).toEqual([0, 0, 0]);
        expect(stage.quaternion.toArray()).toEqual([0, 0, 0, 1]);
        expect(stage.scale.toArray()).toEqual([1.15, 1.15, 1.15]);
        for (const t of [0.3, 1.5, 3.5, 5.5, 8.2, 11.15, 13.8]) {
          cubes.update(t);
          scene.updateMatrixWorld(true);
          expect(cubes.geo.getAttribute("position").count).toBeGreaterThan(0);
          expect(cubes.presence.array.some((value) => value > 0)).toBe(true);
          expect(cubes.mesh.parent).toBe(stage);
          expect(arcs.parent).toBe(stage);
          expect(sparks.parent).toBe(stage);
        }
        expect(cubes.white.array.some((value) => value > 0.8)).toBe(true);
        // Swapping a shared uniform may replace the sky material. The retained
        // floor must stay mounted without being disposed as a side effect.
        let floorDisposals = 0;
        const floorMesh = floor as THREE.Mesh;
        floorMesh.geometry.addEventListener("dispose", () => {
          floorDisposals++;
        });
        const alternateCharge = { value: 0.5 };
        const refreshed = (
          <>
            <StaticEnvironment charge={alternateCharge} />
            <WordmarkStage objects={objects} />
          </>
        );
        await act(async () => {
          root.render(strict ? <StrictMode>{refreshed}</StrictMode> : refreshed);
        });
        expect(scene.getObjectByName("CinematicObsidianFloor")).toBe(floor);
        expect(floorDisposals).toBe(0);
        const refreshedSky = scene.getObjectByName("VTMNPlasmaAtmosphere") as THREE.Mesh;
        expect((refreshedSky.material as THREE.ShaderMaterial).uniforms["uCharge"]).toBe(
          alternateCharge,
        );
        // Replay: unmount then mount again with the same primitive resources.
        await act(async () => {
          root.render(null);
        });
        await act(async () => {
          root.render(strict ? <StrictMode>{content}</StrictMode> : content);
        });
        const replayStage = scene.getObjectByName("VTMNMonument")!;
        expect(replayStage.children).toHaveLength(7);
        expect(cubes.mesh.parent).toBe(replayStage);
      } finally {
        await act(async () => {
          await root.unmount();
        });
        cubes.dispose();
        arcs.geometry.dispose();
        (arcs.material as THREE.Material).dispose();
        sparks.geometry.dispose();
        (sparks.material as THREE.Material).dispose();
      }
    },
  );
});
