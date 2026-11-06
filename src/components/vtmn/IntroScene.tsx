import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BloomEffect } from "postprocessing";
import * as THREE from "three";
import { buildWordmark, CELL } from "@/lib/vtmn/glyphs";
import { LETTER_BOUNDS, TOTAL_W } from "@/lib/vtmn/brand";
import {
  T,
  PHASES,
  lerp,
  smoothstep,
  cameraRig,
  phaseName,
  inspectionOptions,
} from "@/lib/vtmn/timeline";
import { createCubeInstances } from "./cube-instances";
import { scaleFramingPadding, WORDMARK_SCALE } from "@/lib/vtmn/scale";
import { applyCameraOrbit, cameraOrbitScratch } from "./camera-orbit";
import { StaticEnvironment } from "./StaticEnvironment";
import { localArcAllowed } from "@/lib/vtmn/connections";
import { createSparkMaterial } from "./spark-material";
import { bindRendererRecovery } from "./renderer-recovery";
import { sampleFinalIllumination } from "@/lib/vtmn/visual-identity";

const PURPLE = new THREE.Color(0.55, 0.18, 1);
const MAX_SEGMENTS = 18000;
const MAX_SPARKS = 14000;

/** Let the reconciler own parent changes at commit time. A memo calculation
 * must not reparent shared objects: Strict Mode evaluates it twice. */
export function WordmarkStage({ objects }: { objects: THREE.Object3D[] }) {
  return (
    <group name="VTMNMonument" scale={WORDMARK_SCALE}>
      {objects.map((object) => (
        <primitive key={object.uuid} object={object} />
      ))}
    </group>
  );
}

// Same buffer-based arcs and sparks as the original, sampled analytically so
// a held frame is identical whether reached by playback or a direct timeline link.
function lineBuffer() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_SEGMENTS * 6),
    col = new Float32Array(MAX_SEGMENTS * 6);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;
  return { geo, pos, col, mat, mesh };
}

function Scene({
  onTick,
  onError,
  startAt,
  hold,
}: {
  onTick: (t: number) => void;
  onError: () => void;
  startAt: number;
  hold: boolean;
}) {
  const { camera, scene, size, gl } = useThree();
  const elapsed = useRef(startAt);
  const wm = useMemo(() => buildWordmark(), []);
  const rig = useMemo(
    () => cameraRig(size.width / Math.max(size.height, 1)),
    [size.width, size.height],
  );
  const cubes = useMemo(() => createCubeInstances(wm), [wm]);
  const resources = useMemo(() => {
    const arcs = lineBuffer();
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(MAX_SPARKS * 3),
      sparkCol = new Float32Array(MAX_SPARKS * 3);
    sparkGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    sparkGeo.setAttribute(
      "color",
      new THREE.BufferAttribute(sparkCol, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const sparkMat = createSparkMaterial();
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.frustumCulled = false;
    return {
      arcs,
      sparkGeo,
      sparkPos,
      sparkCol,
      sparkMat,
      sparks,
      camera: cameraOrbitScratch(),
      illumination: { charge: 0, resting: 0 },
    };
  }, []);
  const lights = useMemo(() => {
    const key = new THREE.DirectionalLight("#e5defc", 2.4);
    key.position.set(-20, 18, 25);
    const front = new THREE.DirectionalLight("#ffffff", 0.8);
    front.position.set(10, 6, 45);
    const rim = new THREE.DirectionalLight(PURPLE, 2);
    rim.position.set(0, 10, -12);
    const nodes = LETTER_BOUNDS.map((b) => {
      const light = new THREE.PointLight(PURPLE, 0, 26, 1.4);
      light.position.set(b.cx, 1, 3);
      return light;
    });
    return { key, front, rim, nodes };
  }, []);
  const stageObjects = useMemo(
    () => [cubes.mesh, resources.arcs.mesh, resources.sparks, ...lights.nodes],
    [cubes, resources, lights],
  );
  const bloom = useRef<BloomEffect>(null);

  useEffect(() => bindRendererRecovery(gl, onError), [gl, onError]);

  useEffect(
    () => () => {
      cubes.dispose();
      resources.arcs.geo.dispose();
      resources.arcs.mat.dispose();
      resources.sparkGeo.dispose();
      resources.sparkMat.dispose();
      lights.key.dispose();
      lights.front.dispose();
      lights.rim.dispose();
      lights.nodes.forEach((l) => l.dispose());
    },
    [resources, cubes, lights],
  );

  useFrame((_, delta) => {
    const t = hold ? startAt : (elapsed.current += Math.min(delta, 0.1));
    onTick(t);
    const r = resources;
    sampleFinalIllumination(t, r.illumination);
    const cam = camera as THREE.PerspectiveCamera;
    applyCameraOrbit(cam, rig, t, r.camera, scaleFramingPadding(rig.aspect, t));
    const ignition = Math.exp(-Math.pow((t - 0.18) / 0.14, 2));
    const surge = Math.exp(-Math.pow((t - 12.6) / 0.65, 2));
    const wake = smoothstep(0.02, 0.6, t);
    lights.key.intensity = 1.4 + 1.2 * wake + 1.5 * smoothstep(12.9, 13.7, t);
    lights.front.intensity = 0.45 + 0.45 * wake + 1.1 * smoothstep(12.9, 13.7, t);
    lights.rim.intensity = 1 + 1.2 * wake + surge * 2;
    lights.nodes.forEach((light, i) => {
      const phase = PHASES[i]!.start;
      light.intensity =
        (t > phase ? 28 + 13 * Math.sin(t * 8 + i) ** 2 : 0) +
        surge * 100 +
        (i === 0 ? ignition * 120 : 0);
      // Only the authorized resting illumination changes; construction is unchanged.
      light.intensity = lerp(light.intensity, 32, r.illumination.resting);
    });
    scene.environmentIntensity = 0.32 + 0.4 * wake;
    if (bloom.current) {
      const resolved = smoothstep(T.REVEAL, T.REVEAL + 0.55, t);
      bloom.current.intensity = lerp(0.7, 0.26, resolved) + surge * 0.42 + ignition * 0.25;
      bloom.current.luminanceMaterial.threshold = lerp(1.1, 2.8, resolved);
    }
    // Distance-normalized haze keeps portrait and rear views equally legible.
    if (scene.fog instanceof THREE.FogExp2)
      scene.fog.density = 0.0022 * Math.min(1, 80 / rig.finalDistance);
    cubes.update(t);
    cubes.material.u.uFinalCharge.value = r.illumination.charge;
    cubes.material.u.uResting.value = r.illumination.resting;

    // Finite, preallocated polyline writer: jitter is seeded in world space and time.
    let segments = 0;
    const write = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
      power: number,
      core = false,
    ) => {
      if (segments >= MAX_SEGMENTS) return;
      const j = segments++ * 6;
      r.arcs.pos[j] = ax;
      r.arcs.pos[j + 1] = ay;
      r.arcs.pos[j + 2] = az;
      r.arcs.pos[j + 3] = bx;
      r.arcs.pos[j + 4] = by;
      r.arcs.pos[j + 5] = bz;
      for (let k = 0; k < 2; k++) {
        const o = j + k * 3;
        r.arcs.col[o] = power * (core ? 1.5 : 0.65);
        r.arcs.col[o + 1] = power * (core ? 1.1 : 0.16);
        r.arcs.col[o + 2] = power * (core ? 1.8 : 1.5);
      }
    };
    const bolt = (
      a: number,
      b: number,
      power: number,
      seed: number,
      branches = false,
      rear = false,
    ) => {
      if (!localArcAllowed(wm.chunks, cubes.positions, cubes.active, a, b)) return;
      const surface = rear ? -CELL * 2.62 : CELL * 0.62;
      const ai = a * 3,
        bi = b * 3;
      const ax = cubes.positions[ai]!,
        ay = cubes.positions[ai + 1]!,
        az = cubes.positions[ai + 2]! + surface;
      const bx = cubes.positions[bi]!,
        by = cubes.positions[bi + 1]!,
        bz = cubes.positions[bi + 2]! + surface;
      const length = Math.hypot(bx - ax, by - ay, bz - az);
      const steps = Math.min(48, Math.max(5, Math.ceil(length * 5)));
      let px = ax,
        py = ay,
        pz = az;
      const flicker = Math.floor(t * 24) * 1.73;
      for (let k = 1; k <= steps; k++) {
        const u = k / steps,
          envelope = Math.sin(u * Math.PI),
          noise = seed + k * 12.9898 + flicker;
        const amp = Math.min(0.12, length * 0.16) * envelope;
        const x = lerp(ax, bx, u) + Math.sin(noise * 3.1) * amp * 0.45;
        const y = lerp(ay, by, u) + Math.sin(noise * 1.7) * amp;
        const z = lerp(az, bz, u) + Math.cos(noise * 2.3) * amp * 0.6;
        write(px, py, pz, x, y, z, power);
        if (power > 0.9) write(px, py, pz + 0.006, x, y, z + 0.006, power * 0.35, true);
        if (branches && k % 4 === 0) {
          const dx = Math.sin(seed + k) * 0.22,
            dy = Math.cos(seed + k) * 0.22;
          write(x, y, z, x + dx * 0.5, y + dy * 0.5, z + 0.12, power * 0.5);
          write(x + dx * 0.5, y + dy * 0.5, z + 0.12, x + dx, y + dy, z - 0.1, power * 0.2);
        }
        px = x;
        py = y;
        pz = z;
      }
    };
    wm.chunks.forEach((ch, ci) => {
      if (ch.parent < 0) return;
      const state = cubes.states[ci]!,
        parent = cubes.states[ch.parent]!;
      const age = t - ch.tActivate;
      const activation = age >= 0 && age < 0.3 ? (1 - age / 0.3) * 1.8 : 0;
      const lockAge = t - ch.tArrive;
      const lock = lockAge >= 0 && lockAge < 0.16 ? 1 - lockAge / 0.16 : 0;
      const conduit =
        state.connected && parent.connected && ci % 3 === 0
          ? Math.max(0, state.energy - 0.17) * 0.7
          : 0;
      if (activation + lock + conduit > 0.09) {
        bolt(ch.parent, ci, activation + lock + conduit, ch.seed, conduit > 0.5);
        if (state.connected && parent.connected)
          bolt(ch.parent, ci, lock + conduit + 0.1, ch.seed + 3, conduit > 0.5, true);
      }
      // Selected neighboring loops keep completed letters alive between major events.
      if (state.connected && ci % 41 === 0 && Math.sin(t * 13 - ch.seed) > 0.82) {
        const neighbor = ch.neighbors[0];
        if (neighbor !== undefined && cubes.states[neighbor]!.connected)
          bolt(ci, neighbor, 0.7 + conduit, ch.seed + 5, true);
      }
    });
    // Individual electrical disturbances, occupying empty 3D space before any solid shell.
    for (let i = 0; i < wm.cells.length; i++) {
      const life = cubes.appearance[i]!,
        plan = cubes.plans[i]!;
      if (!life.present || life.ignition < 0.02 || life.matter >= 1) continue;
      const j = i * 3,
        seed = wm.cells[i]!.h * 71;
      const x = cubes.instancePositions[j]!,
        y = cubes.instancePositions[j + 1]!,
        z = cubes.instancePositions[j + 2]!;
      const radius = 0.035 + 0.14 * (1 - life.matter);
      const pulse = life.ignition * 1.8;
      const phase = (t - plan.ignite) * 26 + seed;
      for (let k = 0; k < 3; k++) {
        const a = phase + k * 2.094,
          b = a + 0.9;
        const ax = x + Math.cos(a) * radius,
          ay = y + Math.sin(a) * radius;
        const az = z + Math.sin(a * 1.7) * radius;
        const bx = x + Math.cos(b) * radius * 0.55,
          by = y + Math.sin(b) * radius * 0.55;
        const bz = z + Math.cos(b * 1.9) * radius * 0.55;
        write(ax, ay, az, bx, by, bz, pulse, k === 0);
      }
    }
    r.arcs.geo.setDrawRange(0, segments * 2);
    r.arcs.geo.attributes["position"]!.needsUpdate = true;
    r.arcs.geo.attributes["color"]!.needsUpdate = true;

    // Lock-event showers and surge junction sparks, not unrelated drifting debris.
    let sparkCount = 0;
    const spark = (x: number, y: number, z: number, age: number, seed: number, power: number) => {
      if (age < 0 || age > 0.85 || sparkCount >= MAX_SPARKS) return;
      const j = sparkCount++ * 3,
        angle = seed * 23.17,
        speed = (1 + Math.sin(seed * 7) ** 2 * 3.5) * power;
      const move = (1 - Math.exp(-age * 2)) / 2;
      r.sparkPos[j] = x + Math.cos(angle) * speed * move;
      r.sparkPos[j + 1] = y + Math.sin(angle) * speed * move - age * age * 2;
      r.sparkPos[j + 2] = z + Math.sin(seed * 13) * speed * move * 0.55;
      const intensity = (1 - age / 0.85) ** 2 * 3;
      r.sparkCol[j] = intensity * 0.8;
      r.sparkCol[j + 1] = intensity * (age < 0.08 ? 0.9 : 0.23);
      r.sparkCol[j + 2] = intensity * 1.5;
    };
    // Soft, radial particles condense into each instance's growing edge shell.
    for (let i = 0; i < wm.cells.length; i++) {
      const life = cubes.appearance[i]!;
      if (!life.present || life.ignition < 0.015 || life.matter >= 1) continue;
      const j = i * 3,
        seed = wm.cells[i]!.h * 83;
      const radius = 0.04 + 0.22 * (1 - life.matter);
      for (let k = 0; k < 6 && sparkCount < MAX_SPARKS; k++) {
        const o = sparkCount++ * 3,
          phase = seed + k * 2.399 + (t - cubes.plans[i]!.ignite) * 9;
        const z = Math.sin(seed + k * 1.8),
          ring = Math.sqrt(1 - z * z);
        r.sparkPos[o] = cubes.instancePositions[j]! + Math.cos(phase) * ring * radius;
        r.sparkPos[o + 1] = cubes.instancePositions[j + 1]! + Math.sin(phase) * ring * radius;
        r.sparkPos[o + 2] = cubes.instancePositions[j + 2]! + z * radius;
        const power = life.ignition * (k === 0 ? 2.6 : 1.6);
        r.sparkCol[o] = power * 0.9;
        r.sparkCol[o + 1] = power * (k === 0 ? 0.65 : 0.2);
        r.sparkCol[o + 2] = power * 1.8;
      }
    }
    wm.chunks.forEach((ch, i) => {
      const age = t - ch.tArrive;
      if (age >= 0 && age < 0.85 && i % 2 === 0)
        for (let k = 0; k < 7; k++)
          spark(ch.cx, ch.cy, i % 4 === 0 ? -CELL * 2.8 : CELL, age, ch.seed + k, 0.6);
      if (i % 6 === 0) {
        const u = (ch.cx + TOTAL_W / 2) / TOTAL_W;
        for (let k = 0; k < 5; k++)
          spark(ch.cx, ch.cy, CELL, t - (12.05 + u * 0.95), ch.seed + k, 1.1);
      }
    });
    r.sparkGeo.setDrawRange(0, sparkCount);
    r.sparkGeo.attributes["position"]!.needsUpdate = true;
    r.sparkGeo.attributes["color"]!.needsUpdate = true;
    r.sparkMat.uniforms["uPixel"]!.value = gl.getPixelRatio();
  });

  return (
    <>
      <color attach="background" args={["#050507"]} />
      <fogExp2 attach="fog" args={["#08060d", 0.003]} />
      <ambientLight intensity={0.2} />
      <primitive object={lights.key} />
      <primitive object={lights.front} />
      <primitive object={lights.rim} />
      <StaticEnvironment charge={cubes.material.u.uFinalCharge} />
      <WordmarkStage objects={stageObjects} />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 14, 10]} scale={[100, 3, 1]} />
        <Lightformer
          intensity={1.4}
          position={[-42, 2, 6]}
          rotation-y={Math.PI / 3}
          scale={[3, 18, 1]}
        />
        <Lightformer intensity={2.4} color="#8a3dff" position={[30, -4, 5]} scale={[36, 0.7, 1]} />
        <Lightformer
          intensity={2.0}
          position={[0, 10, -18]}
          rotation-y={Math.PI}
          scale={[90, 4, 1]}
        />
        <Lightformer
          intensity={1.5}
          color="#8a3dff"
          position={[-24, -5, -12]}
          rotation-y={Math.PI}
          scale={[32, 2, 1]}
        />
      </Environment>
      <EffectComposer>
        <Bloom
          ref={bloom}
          mipmapBlur
          intensity={0.8}
          luminanceThreshold={1.1}
          luminanceSmoothing={0.2}
          radius={0.72}
        />
        {!hold && <Noise opacity={0.018} />}
        <Vignette eskil={false} offset={0.22} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

export default function IntroScene({
  onTransition,
  onEnd,
  fading,
}: {
  onTransition: () => void;
  onEnd: () => void;
  fading: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null),
    tc = useRef<HTMLSpanElement>(null),
    ph = useRef<HTMLSpanElement>(null);
  const flags = useRef({ ready: false, transition: false, end: false });
  // Website entry always plays the approved timeline; inspection stays standalone.
  const [inspection] = useState(() => inspectionOptions(""));
  const cb = useRef({ onTransition, onEnd });
  cb.current = { onTransition, onEnd };
  const onTick = useMemo(
    () => (t: number) => {
      if (!flags.current.ready) {
        flags.current.ready = true;
        wrap.current?.setAttribute("data-scene-ready", "true");
      }
      if (tc.current) tc.current.textContent = `T+${t.toFixed(2).padStart(5, "0")}`;
      if (ph.current) ph.current.textContent = phaseName(t);
      if (inspection.hold) return;
      if (!flags.current.transition && t >= T.TRANSITION) {
        flags.current.transition = true;
        cb.current.onTransition();
      }
      if (!flags.current.end && t >= T.END) {
        flags.current.end = true;
        cb.current.onEnd();
      }
    },
    [inspection.hold],
  );
  // Watchdog covers failure before the first R3F frame, including a stalled asset or renderer.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!flags.current.ready) cb.current.onEnd();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      ref={wrap}
      data-testid="electric-genesis"
      className={`vt-intro fixed inset-0 z-20 bg-background ${fading ? "vt-intro-out" : ""}`}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ fov: 36, near: 0.1, far: 1200, position: [0, 0, 90] }}
      >
        <Scene
          onTick={onTick}
          onError={onEnd}
          startAt={inspection.startAt}
          hold={inspection.hold}
        />
      </Canvas>
    </div>
  );
}
