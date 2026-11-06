import { AdditiveBlending, BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { SURFACE_NOISE } from "./surface-noise";

/** Fixed world-space violet dusk: continuous color, diffuse cloud banks and
 * the approved translucent silk wisps. No camera attachment or volume pass. */
export function createPlasmaAtmosphere(charge = { value: 0 }) {
  const material = new ShaderMaterial({
    name: "DistantVioletSilk",
    side: BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uCharge: charge },
    vertexShader: /* glsl */ `
      varying vec3 vSkyWorld;
      void main() {
        vSkyWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // The sky remains beyond all subjects without changing camera far/near.
        clip.z = clip.w * 0.999999;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vSkyWorld;
      uniform float uCharge;
      ${SURFACE_NOISE}
      float violetRibbon(vec3 d, vec2 heading, float height, float phase) {
        heading = normalize(heading);
        float facing = dot(d.xz, heading);
        float u = dot(d.xz, vec2(-heading.y, heading.x));
        float window = smoothstep(0.25, 0.85, facing) * exp(-u * u * 1.4);
        float irregular = (vtmnNoise(vec2(u * 3.5 + phase, d.y * 9.0)) - 0.5) * 0.025;
        float curve = height + sin(u * 3.6 + phase) * 0.035 +
          sin(u * 8.2 + phase * 1.7) * 0.012 + irregular;
        float broadDistance = (d.y - curve) * 42.0;
        float silkDistance = (d.y - curve - 0.014) * 110.0;
        float broad = exp(-broadDistance * broadDistance);
        float silk = exp(-silkDistance * silkDistance);
        float broken = mix(0.25, 1.0, vtmnNoise(vec2(u * 8.0 + phase, d.y * 23.0)));
        return (broad * 0.62 + silk * 0.28) * window * broken;
      }
      vec3 violetDusk(vec3 d) {
        float elevation = clamp(d.y, 0.0, 1.0);
        vec3 lavender = vec3(0.056, 0.032, 0.082);
        vec3 mauve = vec3(0.027, 0.0125, 0.043);
        vec3 plum = vec3(0.0045, 0.002, 0.010);
        vec3 atmosphere = mix(lavender, mauve, smoothstep(0.08, 0.56, elevation));
        atmosphere = mix(atmosphere, plum, smoothstep(0.32, 1.0, elevation));

        // Broad directional cloud banks and a finer high veil. Sampling the
        // normalized world direction avoids an azimuth texture seam or repeat.
        float warp = vtmnNoise(d.xz * 2.1 + vec2(d.y * 0.8, -d.y * 1.3));
        vec2 bankUv = d.xz * 3.4 + vec2(d.y * 1.2, d.y * 0.9)
          + vec2(warp, -warp) * 0.9;
        float bank = vtmnNoise(bankUv);
        float veil = vtmnNoise(d.xz * 6.8 + vec2(-d.y * 1.8, d.y * 2.4) + vec2(9.2, 17.6));
        float cloud = smoothstep(0.28, 0.78, bank * 0.78 + veil * 0.22);
        vec3 cloudLight = mix(vec3(0.068, 0.042, 0.095), vec3(0.026, 0.014, 0.047),
          smoothstep(0.1, 0.85, elevation));
        float diffusion = 0.15 + 0.18 * exp(-elevation * elevation * 3.0);
        atmosphere *= 0.9 + veil * 0.1;
        atmosphere = mix(atmosphere, atmosphere * 0.72, cloud * 0.35);
        atmosphere += cloudLight * cloud * diffusion;
        // Very broad lighting variation; no sun, disc or circular focal object.
        atmosphere *= 0.94 + 0.06 * dot(d.xz, vec2(-0.6, 0.8));

        // Fade added sky radiance into the existing dark backdrop at the true
        // horizon. The approved floor/fog/reflection material stays untouched.
        return atmosphere * smoothstep(-0.02, 0.16, d.y);
      }
      void main() {
        vec3 d = normalize(vSkyWorld);
        if (d.y < -0.035) discard;
        float density = 0.0;
        // Wisps retain their approved curves, colors, alpha and charge response.
        // Only skip their work where their Gaussian profiles are already dark.
        if (d.y > -0.01 && d.y < 0.32) {
          density = violetRibbon(d, vec2(-0.8, 0.6), 0.035, 1.8)
            + violetRibbon(d, vec2(0.86, 0.5), 0.075, 4.1) * 0.8
            + violetRibbon(d, vec2(0.15, -0.99), 0.13, 6.7) * 0.65;
        }
        float opacity = clamp(density * 0.22 * (1.0 + 0.1 * uCharge), 0.0, 0.24) * smoothstep(-0.01, 0.025, d.y);
        // Premultiply the original wisp contribution before adding it to the
        // continuous atmosphere. Existing additive blending preserves the dark
        // backdrop and keeps all opaque scene geometry in front of the sky.
        vec3 radiance = violetDusk(d) + vec3(0.14, 0.025, 0.34) * opacity;
        gl_FragColor = vec4(radiance, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new Mesh(new SphereGeometry(1, 48, 24), material);
  sky.name = "VTMNPlasmaAtmosphere";
  sky.scale.setScalar(4000);
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  return sky;
}
