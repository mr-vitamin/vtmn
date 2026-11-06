/** Small shared, non-periodic value-noise helper for material variation.
 * No textures, time uniforms or per-instance resources. */
export const SURFACE_NOISE = /* glsl */ `
float vtmnHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vtmnNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vtmnHash(cell), vtmnHash(cell + vec2(1.0, 0.0)), f.x),
             mix(vtmnHash(cell + vec2(0.0, 1.0)), vtmnHash(cell + vec2(1.0, 1.0)), f.x), f.y);
}
`;
