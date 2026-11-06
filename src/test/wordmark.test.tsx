import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandLockup, BrandSymbol, Wordmark, WordmarkText } from "@/components/wordmark";
import wordmarkSource from "@/assets/brand/vtmn-wordmark.svg?raw";
import symbolSource from "@/assets/brand/vtmn-symbol.svg?raw";
import lockupSource from "@/assets/brand/vtmn-lockup.svg?raw";
import webLockupSource from "@/assets/brand/vtmn-lockup-web.svg?raw";

afterEach(cleanup);
const parse = (source: string) => new DOMParser().parseFromString(source, "image/svg+xml");

describe("official VTMN artwork", () => {
  it("preserves every wordmark fragment and namespaces inline IDs", () => {
    const { container } = render(
      <>
        <WordmarkText id="first" />
        <WordmarkText id="second" />
      </>,
    );
    const original = [...parse(wordmarkSource).querySelectorAll("polygon")];
    expect(original).toHaveLength(11);
    for (const id of ["first", "second"]) {
      const svg = container.querySelector(`#${id}`)!;
      expect(svg.getAttribute("viewBox")).toBe("0 0 1874.98999 244.5674");
      expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
      expect(svg.querySelectorAll("polygon")).toHaveLength(11);
      for (const fragment of original) {
        const rendered = svg.querySelector(`[data-brand-fragment="${fragment.id}"]`)!;
        expect(rendered.id).toBe(`${id}-${fragment.id}`);
        expect(rendered.getAttribute("points")).toBe(fragment.getAttribute("points"));
      }
      expect(svg.querySelectorAll("[transform]")).toHaveLength(0);
    }
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses accessible, proportionally sized image assets", () => {
    const { getByAltText, container } = render(
      <>
        <Wordmark />
        <BrandSymbol />
        <BrandLockup />
      </>,
    );
    expect(getByAltText("VTMN").getAttribute("width")).toBe("1874.98999");
    expect(getByAltText("VTMN — Esse Quam Videri").getAttribute("height")).toBe("600");
    expect(container.querySelector('[aria-hidden="true"]')?.getAttribute("width")).toBe(
      "832.88351",
    );
  });

  it("retains all lockup foreground geometry and embeds the confirmed motto font", () => {
    const original = parse(lockupSource),
      web = parse(webLockupSource);
    for (const node of original.querySelectorAll("polygon, g, rect, linearGradient, filter")) {
      if (node.id === "presentation-background") continue;
      const copy = web.getElementById(node.id)!;
      expect(copy, node.id).toBeTruthy();
      for (const attribute of node.attributes)
        expect(copy.getAttribute(attribute.name)).toBe(attribute.value);
    }
    expect(web.querySelectorAll("polygon")).toHaveLength(18);
    expect(web.getElementById("presentation-background")).toBeNull();
    const motto = web.getElementById("Latin_Motto")!;
    for (const attribute of [
      "x",
      "y",
      "font-size",
      "font-weight",
      "letter-spacing",
      "text-anchor",
      "fill",
    ]) {
      expect(motto.getAttribute(attribute)).toBe(
        original.getElementById("Latin_Motto")!.getAttribute(attribute),
      );
    }
    expect(motto.textContent).toBe("ESSE QUAM VIDERI");
    expect(motto.getAttribute("font-family")).toBe("Inter");
    expect(web.querySelector("style")!.textContent).toMatch(
      /font-weight:300;src:url\(data:font\/woff2;base64,/,
    );
  });

  it("keeps the seven symbol fragments and has no executable or external artwork content", () => {
    expect(parse(symbolSource).querySelectorAll("polygon")).toHaveLength(7);
    for (const source of [symbolSource, wordmarkSource, webLockupSource]) {
      expect(source).not.toMatch(
        /<script|<foreignObject|<image|\son\w+=|(?:href|src)=["']https?:/i,
      );
    }
  });
});
