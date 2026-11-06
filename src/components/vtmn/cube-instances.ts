import * as THREE from "three";
import { CELL, type buildWordmark } from "@/lib/vtmn/glyphs";
import { cubeState, easeOutCubic, smoothstep, type CubeState } from "@/lib/vtmn/timeline";
import {
  materializationPlan,
  materializationAt,
  type MaterializationState,
} from "@/lib/vtmn/materialization";
import { makeSeamMaterial } from "./seam-material";
import { chamferBox } from "./chamfer-box";
import { WORDMARK_SCALE, CUBE_GEOMETRY_SCALE } from "@/lib/vtmn/scale";

type Wordmark = ReturnType<typeof buildWordmark>;
/** One instanced draw, one clock, independent formation for every physical cube. */
export function createCubeInstances(wm: Wordmark) {
  const material = makeSeamMaterial();
  const geo = chamferBox(
    CELL * 0.94 * CUBE_GEOMETRY_SCALE,
    CELL * 0.94 * CUBE_GEOMETRY_SCALE,
    CELL * 0.96 * CUBE_GEOMETRY_SCALE,
  );
  const attribute = (name: string) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(wm.cells.length), 1).setUsage(
      THREE.DynamicDrawUsage,
    );
    geo.setAttribute(name, a);
    return a;
  };
  const energy = attribute("aEnergy"),
    white = attribute("aWhite");
  const presence = attribute("aPresence"),
    matter = attribute("aMatter"),
    seed = attribute("aSeed");
  const mesh = new THREE.InstancedMesh(geo, material.m, wm.cells.length);
  mesh.name = "ElectricGenesisCubes";
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const plans = wm.cells.map((cell) => materializationPlan(cell, wm.chunks[cell.chunk]!));
  const appearance: MaterializationState[] = plans.map(() => ({
    present: false,
    growth: 0,
    matter: 0,
    travel: 0,
    ignition: 0,
  }));
  const states: CubeState[] = wm.chunks.map(() => ({
    progress: 0,
    energy: 0,
    white: 0,
    connected: false,
  }));
  const positions = new Float32Array(wm.chunks.length * 3),
    active = new Float32Array(wm.chunks.length);
  const instancePositions = new Float32Array(wm.cells.length * 3),
    depthOrigins = new Float32Array(wm.cells.length);
  const axes = wm.chunks.map((ch) => new THREE.Vector3(...ch.axis).normalize());
  const matrix = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    local = new THREE.Vector3(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3();
  for (let i = 0; i < wm.cells.length; i++) {
    const cell = wm.cells[i]!,
      ch = wm.chunks[cell.chunk]!;
    depthOrigins[i] =
      Math.abs(ch.off[2]) * (Math.sin(ch.seed * 9.7) > 0.15 ? 1 : -1) + (0.5 - cell.h) * 0.75;
    seed.setX(i, cell.h);
  }
  const update = (t: number) => {
    for (let i = 0; i < wm.chunks.length; i++) cubeState(wm.chunks[i]!, t, states[i]!);
    for (let i = 0; i < wm.cells.length; i++) {
      const cell = wm.cells[i]!,
        ch = wm.chunks[cell.chunk]!,
        state = states[cell.chunk]!;
      const life = materializationAt(plans[i]!, t, appearance[i]!);
      // The approved path, quaternion and mechanical lock are retained; departure
      // waits for matter to form and each instance retains the original arrival time.
      const p = life.travel,
        remain = 1 - easeOutCubic(p),
        lift = Math.sin(p * Math.PI);
      const breathe = Math.sin(t * 1.3 + ch.seed) * 0.08 * (1 - smoothstep(0, 0.15, p));
      const formationTurn =
        Math.sin((t - plans[i]!.ignite) * 8 + cell.h * 4) * 0.13 * (1 - life.matter);
      q.setFromAxisAngle(axes[cell.chunk]!, ch.angle * remain + formationTurn);
      local.set(0, 0, cell.z).applyQuaternion(q);
      position.set(
        ch.cx + ch.off[0] * remain + Math.sin(ch.seed) * lift * 0.35 + local.x,
        ch.cy + ch.off[1] * remain + lift * (ch.letter === 2 ? 1 : 0.3) + breathe + local.y,
        depthOrigins[i]! * remain + Math.sin(p * Math.PI * 2) * 0.25 + local.z,
      );
      scale.set(life.growth, life.growth, cell.sz * life.growth);
      matrix.compose(position, q, scale);
      mesh.setMatrixAt(i, matrix);
      instancePositions[i * 3] = position.x;
      instancePositions[i * 3 + 1] = position.y;
      instancePositions[i * 3 + 2] = position.z;
      if (cell.layer === 0) {
        const j = cell.chunk * 3;
        positions[j] = position.x;
        positions[j + 1] = position.y;
        positions[j + 2] = position.z;
        active[cell.chunk] = life.present ? 1 : 0;
      }
      const exists = life.growth > 0 ? 1 : 0;
      presence.setX(i, exists);
      matter.setX(i, life.matter);
      const outerLayer = cell.layer === 0 || cell.layer === 2;
      energy.setX(
        i,
        exists *
          (state.energy + life.ignition * (1 - life.matter) * 1.6) *
          (outerLayer ? 1 : 0.6) *
          (0.85 + 0.15 * Math.sin(cell.h * 50 + t * 5)),
      );
      white.setX(i, state.white * (outerLayer ? 0.95 : 0.35));
    }
    mesh.instanceMatrix.needsUpdate = true;
    energy.needsUpdate = true;
    white.needsUpdate = true;
    presence.needsUpdate = true;
    matter.needsUpdate = true;
  };
  update(0); // Never expose InstancedMesh's default identity matrices on its first render.
  return {
    mesh,
    geo,
    material,
    energy,
    white,
    presence,
    matter,
    plans,
    appearance,
    states,
    positions,
    active,
    instancePositions,
    depthOrigins,
    update,
    dispose() {
      mesh.dispose();
      geo.dispose();
      material.m.dispose();
    },
  };
}

/** One stationary uniform stage keeps geometry, electrical buffers, particles
 * and local node lights aligned without changing their authored coordinates. */
export function createWordmarkStage(...objects: THREE.Object3D[]) {
  const stage = new THREE.Group();
  stage.name = "VTMNMonument";
  stage.scale.setScalar(WORDMARK_SCALE);
  stage.add(...objects);
  stage.updateMatrixWorld(true);
  return stage;
}
