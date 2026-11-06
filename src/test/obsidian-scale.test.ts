import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildWordmark } from "@/lib/vtmn/glyphs";
import { createCubeInstances, createWordmarkStage } from "@/components/vtmn/cube-instances";
import { makeSeamMaterial } from "@/components/vtmn/seam-material";
import { scaleFramingPadding } from "@/lib/vtmn/scale";
import { applyCameraOrbit, cameraOrbitScratch } from "@/components/vtmn/camera-orbit";
import { cameraRig, T } from "@/lib/vtmn/timeline";

describe("substantial obsidian construction", () => {
  it("scales cubes, electrical objects and local lights together without moving or rotating the stage", () => {
    const cube = new THREE.Mesh(),
      arcs = new THREE.LineSegments(),
      sparks = new THREE.Points(),
      light = new THREE.PointLight();
    for (const o of [cube, arcs, sparks, light]) o.position.set(2, -3, 4);
    const stage = createWordmarkStage(cube, arcs, sparks, light);
    expect(stage.position.toArray()).toEqual([0, 0, 0]);
    expect(stage.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    for (const o of stage.children) {
      const p = o.getWorldPosition(new THREE.Vector3());
      expect(p.x).toBeCloseTo(2.3, 8);
      expect(p.y).toBeCloseTo(-3.45, 8);
      expect(p.z).toBeCloseTo(4.6, 8);
    }
    cube.geometry.dispose();
    (cube.material as THREE.Material).dispose();
    arcs.geometry.dispose();
    (arcs.material as THREE.Material).dispose();
    sparks.geometry.dispose();
    (sparks.material as THREE.Material).dispose();
  });
  it("adds only a bounded desktop lens margin while preserving world poses and the portrait/final lens", () => {
    const rig = cameraRig(2.4),
      a = new THREE.PerspectiveCamera(),
      b = new THREE.PerspectiveCamera();
    const sa = cameraOrbitScratch(),
      sb = cameraOrbitScratch();
    let maximum = 0;
    for (let t = 0; t <= T.END; t += 0.025) {
      for (const aspect of [0.42, 0.75, 1]) expect(scaleFramingPadding(aspect, t)).toBe(0);
      const margin = scaleFramingPadding(2.4, t);
      maximum = Math.max(maximum, margin);
      applyCameraOrbit(a, rig, t, sa);
      applyCameraOrbit(b, rig, t, sb, margin);
      expect(a.position.distanceTo(b.position)).toBe(0);
      expect(a.quaternion.angleTo(b.quaternion)).toBeLessThan(0.000001);
      if (t >= T.LOCK) expect(a.fov).toBe(b.fov);
    }
    expect(maximum).toBeGreaterThan(4);
    expect(maximum).toBeLessThan(5);
  });
  it("uses compensated block dimensions so 15% layout scale gives 25% larger cubes", () => {
    const cubes = createCubeInstances(buildWordmark());
    const stage = createWordmarkStage(cubes.mesh);
    cubes.geo.computeBoundingBox();
    const worldSize = cubes.geo.boundingBox!.getSize(new THREE.Vector3()).multiply(stage.scale);
    expect(worldSize.x).toBeCloseTo(0.376, 6);
    expect(worldSize.y).toBeCloseTo(0.376, 6);
    expect(worldSize.z).toBeCloseTo(0.384, 6);
    cubes.dispose();
  });
  it("has real small edge facets with outward triangles and normalized normals", () => {
    const cubes = createCubeInstances(buildWordmark()),
      geo = cubes.geo;
    const position = geo.getAttribute("position"),
      normal = geo.getAttribute("normal");
    const index = geo.index;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      n = new THREE.Vector3();
    let bevelVertices = 0;
    for (let i = 0; i < normal.count; i++) {
      n.fromBufferAttribute(normal, i);
      expect(n.length()).toBeCloseTo(1, 5);
      if ([n.x, n.y, n.z].filter((v) => Math.abs(v) > 0.1).length >= 2) bevelVertices++;
    }
    expect(bevelVertices).toBeGreaterThan(0);
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      const ai = index ? index.getX(i) : i,
        bi = index ? index.getX(i + 1) : i + 1,
        ci = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(position, ai);
      b.fromBufferAttribute(position, bi);
      c.fromBufferAttribute(position, ci);
      n.fromBufferAttribute(normal, ai);
      expect(b.sub(a).cross(c.sub(a)).dot(n)).toBeGreaterThan(0);
    }
    expect((index?.count ?? position.count) / 3).toBeLessThan(60);
    cubes.dispose();
  });
  it("keeps the physical PBR surface opaque and compatible with white and energy attributes", () => {
    const { m } = makeSeamMaterial();
    expect(m).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(m.transparent).toBe(false);
    expect(m.opacity).toBe(1);
    expect(m.wireframe).toBe(false);
    expect(m.depthWrite).toBe(true);
    expect(m.metalness).toBeGreaterThan(0.6);
    expect(m.metalness).toBeLessThan(0.86);
    expect(m.roughness).toBeGreaterThan(0.2);
    expect(m.roughness).toBeLessThan(0.4);
    const shader = {
      ...THREE.ShaderLib.standard,
      uniforms: { ...THREE.ShaderLib.standard.uniforms },
    };
    m.onBeforeCompile(shader as Parameters<typeof m.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("vWhite = aWhite");
    expect(shader.fragmentShader).toContain("mix(diffuseColor.rgb, whiteSurface, chargedFace)");
    expect(shader.fragmentShader).toContain("if (vPresence < 0.5) discard");
    m.dispose();
  });
});
