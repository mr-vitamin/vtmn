import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createSparkMaterial } from "@/components/vtmn/spark-material";
import { makeSeamMaterial } from "@/components/vtmn/seam-material";
import { createPlasmaAtmosphere } from "@/components/vtmn/plasma-atmosphere";

describe("Three material integration", () => {
  it("does not redeclare attributes injected by Three for vertex colors", () => {
    const material = createSparkMaterial();
    expect(material.vertexColors).toBe(true);
    // WebGLProgram provides position, normal, uv and (with USE_COLOR) color.
    // Redeclaring one in a ShaderMaterial makes the GPU compile fail.
    expect(material.vertexShader).not.toMatch(
      /attribute\s+vec[234]\s+(?:color|position|normal|uv)\s*;/,
    );
    expect(material.vertexShader).toContain("vColor=color");
    material.dispose();
  });
  it("injects energy and white attributes at existing standard shader hooks", () => {
    const { m, u } = makeSeamMaterial();
    const standard = THREE.ShaderLib.standard;
    const shader = {
      vertexShader: standard.vertexShader,
      fragmentShader: standard.fragmentShader,
      uniforms: { ...standard.uniforms },
    };
    m.onBeforeCompile(shader as Parameters<typeof m.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain("vEnergy = aEnergy");
    expect(shader.vertexShader).toContain("attribute float aPresence");
    expect(shader.fragmentShader).toContain("if (vPresence < 0.5) discard");
    expect(shader.fragmentShader).toContain("vMatter");
    expect(shader.fragmentShader).toContain("abs(vObjN.z)");
    expect(shader.fragmentShader).toContain("vEnergy + uGlobal");
    expect(shader.uniforms).toHaveProperty("uGlobal", u.uGlobal);
    m.dispose();
  });
  it("shares brushed PBR hooks and final-charge uniforms without dropping instance attributes", () => {
    const { m, u } = makeSeamMaterial();
    const shader = {
      ...THREE.ShaderLib.standard,
      uniforms: { ...THREE.ShaderLib.standard.uniforms },
    };
    m.onBeforeCompile(shader as Parameters<typeof m.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
    expect(shader.uniforms).toHaveProperty("uFinalCharge");
    expect(shader.uniforms).toHaveProperty("uResting");
    expect(shader.fragmentShader).toContain("vtmnBrush");
    expect(shader.fragmentShader.indexOf("float vtmnBrush")).toBeLessThan(
      shader.fragmentShader.indexOf("roughnessFactor ="),
    );
    expect(shader.fragmentShader).toContain("vtmnCharge(vWhite, vEnergy)");
    expect(shader.fragmentShader).toContain("if (vPresence < 0.5) discard");
    expect(m.transparent).toBe(false);
    expect(m.depthWrite).toBe(true);
    m.dispose();
  });
  it("does not use undefined GLSL pow for signed ribbon distances", () => {
    const sky = createPlasmaAtmosphere();
    // Analyze the actual ShaderMaterial submitted to Three. This is a targeted
    // portability check; it is not a claim of GPU compilation or pixel quality.
    expect(sky.material.fragmentShader).not.toMatch(/pow\(\s*\(d\.y\s*-/);
    sky.geometry.dispose();
    sky.material.dispose();
  });
});
