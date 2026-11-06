import {
  Color,
  DepthTexture,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  UnsignedIntType,
  Vector2,
} from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { SURFACE_NOISE } from "./surface-noise";

// Existing formation offsets extend beneath the finished silhouette. Keep the
// floor below those offsets instead of changing any approved cube trajectories.
export const FLOOR_Y = -11;

export function createReflectiveFloor(resolution = 1024) {
  const floor = new Reflector(new PlaneGeometry(6000, 6000), {
    color: "#040405",
    textureWidth: resolution,
    textureHeight: resolution,
    multisample: 2,
    clipBias: 0.003,
    shader: {
      name: "CinematicObsidianReflection",
      uniforms: {
        color: { value: new Color("#040405") },
        tDiffuse: { value: null },
        tDepth: { value: null },
        textureMatrix: { value: new Matrix4() },
        reflectionInverseViewProjection: { value: new Matrix4() },
        floorHeight: { value: FLOOR_Y },
        texel: { value: new Vector2(1 / resolution, 1 / resolution) },
        hazeColor: { value: new Color("#0a0a0c") },
        panelColor: { value: new Color("#080808") },
      },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vProjected;
        varying vec3 vWorld;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() {
          vProjected = textureMatrix * vec4(position, 1.0);
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform vec3 hazeColor;
        uniform vec3 panelColor;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 texel;
        uniform mat4 reflectionInverseViewProjection;
        uniform float floorHeight;
        varying vec4 vProjected;
        varying vec3 vWorld;
        #include <logdepthbuf_pars_fragment>
        ${SURFACE_NOISE}
        // The capture uses an oblique clip plane: reconstruct with its actual
        // inverse projection, rather than a standard perspective depth formula.
        float reflectionHeight(vec2 uv, float depth) {
          if (depth >= 0.99999) return 18.0;
          vec4 world = reflectionInverseViewProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
          if (abs(world.w) < 0.000001) return 18.0;
          return clamp(world.y / world.w - floorHeight, 0.0, 36.0);
        }
        vec4 reflectionSample(vec2 uv) {
          vec3 radiance = texture2D(tDiffuse, uv).rgb;
          float depth = texture2D(tDepth, uv).x;
          float height = reflectionHeight(uv, depth);
          float solid = 1.0 - step(0.99999, depth);
          // Preserve transparent HDR electrical glints as well as opaque cubes;
          // absorb the broad sky so violet highlights do not repaint the stone.
          float luminance = max(dot(radiance, vec3(0.2126, 0.7152, 0.0722)), 0.0);
          float luminous = smoothstep(0.025, 0.5, luminance);
          float absorption = mix(0.020, 1.0, max(solid, luminous));
          float heightFade = mix(0.84, 0.44, smoothstep(0.0, 24.0, height));
          // Grade each tap before filtering, keeping soft silhouette edges free
          // of a sharp center-depth mask. Alpha carries height internally only.
          return vec4(radiance * absorption * heightFade, height);
        }
        // Box-filtered interval coverage preserves a groove's physical width:
        // a subpixel line loses contrast instead of growing into a full pixel.
        vec2 floorBandCoverage(vec2 offset, vec2 halfWidth, vec2 pixel) {
          vec2 lo = max(offset - pixel * 0.5, -halfWidth);
          vec2 hi = min(offset + pixel * 0.5, halfWidth);
          return clamp((hi - lo) / pixel, 0.0, 1.0);
        }
        // Fixed world-space architectural plates, not projected screen lines.
        // Filter in unwrapped coordinates so seams remain stable under motion.
        vec4 floorPanels(vec2 p) {
          vec2 size = vec2(14.0, 9.0);
          float row = floor(p.y / size.y);
          vec2 q = p + vec2(mod(row, 2.0) * size.x * 0.5, 0.0);
          vec2 cell = floor(q / size);
          vec2 local = mod(q, size);
          vec2 pixel = max(fwidth(p), vec2(0.002));
          float visible = 1.0 - smoothstep(0.08, 0.35, max(pixel.x / size.x, pixel.y / size.y));
          vec2 edge = min(local, size - local);
          vec2 seamMask = floorBandCoverage(edge, vec2(0.045), pixel);
          float seam = 1.0 - (1.0 - seamMask.x) * (1.0 - seamMask.y);
          // A faint one-sided inset lip suggests a shallow hard edge, not neon.
          vec2 lipDistance = mod(local - vec2(0.1125) + size * 0.5, size) - size * 0.5;
          vec2 lipMask = floorBandCoverage(lipDistance, vec2(0.0475), pixel);
          float lip = max(lipMask.x, lipMask.y) * (1.0 - seam);
          // Sparse short registration etches; no repeated full-panel border.
          vec2 markMask = floorBandCoverage(local - vec2(2.0, 1.1), vec2(1.1, 0.025), pixel);
          float mark = markMask.x * markMask.y * step(0.66, vtmnHash(cell + vec2(7.0, 19.0)));
          float plate = mix(0.5, vtmnHash(cell), visible);
          return vec4(plate, seam * visible, lip * visible, mark * visible);
        }
        void main() {
          #include <logdepthbuf_fragment>
          vec2 uv = vProjected.xy / vProjected.w;
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float grazing = clamp(1.0 - max(viewDir.y, 0.0), 0.0, 1.0);
          // A broader nine-tap filter leaves a diffuse light impression on solid stone.
          // Quiet domain-warped stone variation, not a repeating line grid.
          vec2 stoneUv = vWorld.xz * 0.035;
          float warp = vtmnNoise(stoneUv * 0.43 + vec2(17.0, -9.0));
          float stone = vtmnNoise(stoneUv + vec2(warp * 1.7, warp * 0.8));
          vec2 microUv = vWorld.xz * 0.8;
          float microFilter = 1.0 - smoothstep(0.25, 1.5, max(fwidth(microUv.x), fwidth(microUv.y)));
          float micro = (vtmnNoise(microUv) - 0.5) * microFilter;
          vec4 center = reflectionSample(uv);
          // One additional 25% footprint increase: 1.5 * 1.25 = 1.875.
          // Weights, height response and offset ratios are unchanged.
          // Static, almost uniform roughness; no moving or wavy UV displacement.
          vec2 spread = texel * 1.875 * (2.0 + 2.4 * smoothstep(0.0, 22.0, center.a)) * (0.995 + stone * 0.01);
          vec2 inner = spread * 0.45;
          vec2 outer = spread * 0.65;
          vec3 reflected = center.rgb * 0.10;
          reflected += reflectionSample(uv + vec2(inner.x, 0.0)).rgb * 0.135;
          reflected += reflectionSample(uv - vec2(inner.x, 0.0)).rgb * 0.135;
          reflected += reflectionSample(uv + vec2(0.0, inner.y)).rgb * 0.135;
          reflected += reflectionSample(uv - vec2(0.0, inner.y)).rgb * 0.135;
          reflected += reflectionSample(uv + outer).rgb * 0.09;
          reflected += reflectionSample(uv - outer).rgb * 0.09;
          reflected += reflectionSample(uv + vec2(outer.x, -outer.y)).rgb * 0.09;
          reflected += reflectionSample(uv + vec2(-outer.x, outer.y)).rgb * 0.09;
          // A gentle HDR shoulder keeps the captured surge visible without a
          // competing second logo. Height also softens and fades distant detail.
          reflected /= 1.0 + 0.45 * max(dot(reflected, vec3(0.2126, 0.7152, 0.0722)), 0.0);
          float edge = smoothstep(0.0, 0.015, min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y)));
          // Matte finish keeps a faint reflected response with little grazing sheen.
          float reflectance = 0.13 + 0.03 * pow(grazing, 5.0);
          float materialDistance = length(cameraPosition.xz - vWorld.xz);
          // Preserve the approved far-plane/horizon treatment exactly. Surface
          // definition lives in the foreground/midground and settles gradually.
          float materialPresence = 1.0 - smoothstep(180.0, 640.0, materialDistance);
          vec4 panels = floorPanels(vWorld.xz);
          vec3 base = color * (0.94 + stone * 0.12 + micro * 0.04);
          vec3 plateBase = panelColor * (0.90 + panels.x * 0.16 + (stone - 0.5) * 0.10 + micro * 0.05);
          plateBase *= 1.0 - panels.y * 0.52 - panels.w * 0.10;
          plateBase += panelColor * panels.z * (0.04 + 0.025 * grazing);
          base = mix(base, plateBase, materialPresence);
          // Plate finish and recessed seams interrupt reflected energy, never
          // the capture UVs: no ripples, moving normals or liquid displacement.
          float finish = (0.66 + panels.x * 0.08) * (1.0 - panels.y * 0.55 - panels.w * 0.12);
          float reflectionFinish = mix(1.0, finish, materialPresence);
          vec3 surface = base + reflected * vec3(0.98, 0.975, 1.0) *
            reflectance * reflectionFinish * (1.0 + micro * 0.01) * edge;
          // A broad charcoal distance tone separates the physical plane from the
          // unchanged sky. Monotonic falloff has no horizon band or drawn seam.
          float floorDistance = length(cameraPosition.xz - vWorld.xz);
          float haze = 1.0 - exp(-floorDistance * 0.0022);
          gl_FragColor = vec4(mix(surface, hazeColor, haze), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    },
  }) as Reflector & { material: ShaderMaterial };
  // Reuse this capture's existing depth pass; no extra scene render. Three
  // resolves the multisampled depth and owns its GPU cleanup with the target.
  const capture = floor.getRenderTarget();
  capture.depthTexture = new DepthTexture(resolution, resolution, UnsignedIntType);
  floor.material.uniforms["tDepth"]!.value = capture.depthTexture;
  // Update only the floor's material after the existing live capture. Reflector
  // modifies projectionMatrix for clipping, so projectionMatrixInverse is stale.
  const captureScene = floor.onBeforeRender;
  const inverseProjection = new Matrix4();
  const inverseViewProjection = floor.material.uniforms["reflectionInverseViewProjection"]!
    .value as Matrix4;
  floor.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    captureScene.call(this, renderer, scene, camera, geometry, material, group);
    const reflectedCamera = floor.getReflectionCamera(camera);
    inverseProjection.copy(reflectedCamera.projectionMatrix).invert();
    inverseViewProjection.multiplyMatrices(reflectedCamera.matrixWorld, inverseProjection);
  };
  floor.name = "CinematicObsidianFloor";
  floor.position.set(0, FLOOR_Y, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.updateMatrixWorld(true);
  return floor;
}
