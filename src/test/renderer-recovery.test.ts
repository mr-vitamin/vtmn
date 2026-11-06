import { describe, expect, it, vi } from "vitest";
import { bindRendererRecovery } from "@/components/vtmn/renderer-recovery";

describe("renderer recovery listeners", () => {
  it("handles real canvas loss and shader errors, and restores the renderer on cleanup", () => {
    const canvas = document.createElement("canvas");
    const previous = vi.fn(),
      recover = vi.fn();
    const renderer = {
      domElement: canvas,
      debug: { checkShaderErrors: true, diagnostics: { keywords: true }, onShaderError: previous },
    };
    const unbind = bindRendererRecovery(renderer, recover);
    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(recover).toHaveBeenCalledTimes(1);
    renderer.debug.onShaderError();
    expect(recover).toHaveBeenCalledTimes(2);
    unbind();
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(recover).toHaveBeenCalledTimes(2);
    expect(renderer.debug.onShaderError).toBe(previous);
  });
});
