import * as THREE from "three";
import { SURFACE_NOISE } from "./surface-noise";

/** Shared brushed graphite/titanium. Formation stays unchanged; the final
 * charge reveals the physical metal again instead of leaving it white. */
export function makeSeamMaterial(color = "#242429") {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.82,
    roughness: 0.34,
    envMapIntensity: 1.25,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    wireframe: false,
  });
  const u = { uGlobal: { value: 0 }, uFinalCharge: { value: 0 }, uResting: { value: 0 } };
  m.customProgramCacheKey = () => "electric-genesis-brushed-graphite-v4";
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float aEnergy; attribute float aWhite; attribute float aPresence;
attribute float aMatter; attribute float aSeed;
varying float vEnergy; varying float vWhite; varying float vPresence; varying float vMatter;
varying float vSeed; varying vec2 vUv2; varying vec3 vObjN; varying vec3 vCubePosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vEnergy = aEnergy; vWhite = aWhite; vPresence = aPresence; vMatter = aMatter;
vSeed = aSeed; vUv2 = uv; vObjN = normal; vCubePosition = position;`,
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uGlobal; uniform float uFinalCharge; uniform float uResting;
varying float vEnergy; varying float vWhite; varying float vPresence; varying float vMatter;
varying float vSeed; varying vec2 vUv2; varying vec3 vObjN; varying vec3 vCubePosition;
${SURFACE_NOISE}
float vtmnCharge(float whiteLevel, float energyLevel) {
  float energized = smoothstep(0.35, 2.6, energyLevel);
  return clamp(uFinalCharge * max(whiteLevel, 0.18 + 0.82 * energized), 0.0, 1.0);
}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
// Hard absence, independent of lighting, view direction, depth and background.
if (vPresence < 0.5) discard;
float formationEdge = 1.0 - smoothstep(0.0, 0.07, min(min(vUv2.x, 1.0-vUv2.x), min(vUv2.y, 1.0-vUv2.y)));
// Electrical edge shells precede solid faces. Opaque microfacets condense, never alpha-fade.
float facet = fract(sin(dot(floor(vCubePosition * 36.0) + vSeed * 31.0, vec3(12.9898,78.233,45.164))) * 43758.5453);
float density = smoothstep(0.0, 0.98, vMatter);
if (vMatter < 0.999 && formationEdge < 0.6 && facet >= density) discard;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
// Two directional grain scales, filtered as they become sub-pixel. Each cube
// has its own stable seed, while sharing this one material and geometry.
vec2 fineBrushUv = vUv2 * vec2(2.5, 120.0) + vec2(vSeed * 17.0, vSeed * 43.0);
vec2 broadBrushUv = vUv2 * vec2(1.5, 12.0) + vec2(vSeed * 11.0, vSeed * 29.0);
float fineFilter = 1.0 - smoothstep(0.2, 1.5, fwidth(fineBrushUv.y));
float broadFilter = 1.0 - smoothstep(0.5, 2.0, fwidth(broadBrushUv.y));
float vtmnBrush = (vtmnNoise(fineBrushUv) - 0.5) * fineFilter * 0.10
  + (vtmnNoise(broadBrushUv) - 0.5) * broadFilter * 0.06;
diffuseColor.rgb *= 1.0 + vtmnBrush;`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
metalnessFactor = mix(clamp(metalnessFactor + vtmnBrush * 0.2, 0.7, 0.9), 0.22,
  vtmnCharge(vWhite, vEnergy) * step(0.5, abs(vObjN.z)));`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + vtmnBrush * 0.8 + (vSeed - 0.5) * 0.025, 0.24, 0.42);
roughnessFactor = mix(roughnessFactor, 0.34 + vSeed * 0.12,
  vtmnCharge(vWhite, vEnergy) * step(0.5, abs(vObjN.z)));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float eD = min(min(vUv2.x, 1.0-vUv2.x), min(vUv2.y, 1.0-vUv2.y));
float edge = 1.0 - smoothstep(0.0, 0.022, eD);
float edgeFine = 1.0 - smoothstep(0.0, 0.03, eD);
float outerFace = step(0.5, abs(vObjN.z));
vec3 purple = vec3(0.55, 0.18, 1.0);
float inset = smoothstep(0.0, 0.09, eD);
vec3 whiteSurface = vec3((0.65 + vSeed * 0.14) * (0.55 + inset * 0.45));
float chargedFace = vtmnCharge(vWhite, vEnergy) * outerFace;
diffuseColor.rgb = mix(diffuseColor.rgb, whiteSurface, chargedFace);
// Selected solid seams respond to the existing energy, without outlining every face.
float selectedSeam = mix(0.12, 1.0, step(0.6, fract(vSeed * 13.7)));
float seamResponse = mix(1.0, selectedSeam, smoothstep(0.65, 1.0, vMatter));
float seamEnergy = mix(vEnergy + uGlobal, 0.09, uResting);
totalEmissiveRadiance += purple * edge * seamEnergy * 1.35 * seamResponse
  + mix(purple, vec3(1.0), 0.3) * edgeFine * (1.0-vMatter) * vEnergy * 2.2
  + mix(purple, vec3(1.0), 0.72) * chargedFace * (1.0-edge) * 0.35;`,
      );
  };
  return { m, u };
}
