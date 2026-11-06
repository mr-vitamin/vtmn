import type { WebGLRenderer } from "three";

/** Bind recoverable renderer failures and release every listener on scene teardown. */
export function bindRendererRecovery(
  renderer: Pick<WebGLRenderer, "domElement" | "debug">,
  recover: () => void,
) {
  const canvas = renderer.domElement;
  const previousShaderError = renderer.debug.onShaderError;
  renderer.debug.onShaderError = () => recover();
  const lost = (event: Event) => {
    event.preventDefault();
    recover();
  };
  canvas.addEventListener("webglcontextlost", lost);
  return () => {
    canvas.removeEventListener("webglcontextlost", lost);
    renderer.debug.onShaderError = previousShaderError;
  };
}
