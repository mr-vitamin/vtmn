import wordmarkUrl from "@/assets/brand/vtmn-wordmark.svg?no-inline";
import wordmarkSvg from "@/assets/brand/vtmn-wordmark.svg?raw";
import symbolUrl from "@/assets/brand/vtmn-symbol.svg?no-inline";
import lockupUrl from "@/assets/brand/vtmn-lockup-web.svg?no-inline";

// Trusted, inspected local artwork only. Keep the approved coordinates/fills in
// the canonical SVG. Inline IDs are namespaced without merging any fragments.
const wordmarkContent = wordmarkSvg
  .replace(/^[\s\S]*?<svg\b[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<title>[\s\S]*?<\/title>/, "");

/** Keeps the existing ident's masks usable; adds no fragment animation. */
export function WordmarkText({ id = "vtmn-official" }: { id?: string }) {
  const markup = wordmarkContent.replace(
    /id="([^"]+)"/g,
    (_, fragment: string) => `id="${id}-${fragment}" data-brand-fragment="${fragment}"`,
  );
  return (
    <svg
      id={id}
      x="0"
      y="0"
      width="1000"
      height="220"
      viewBox="0 0 1874.98999 244.5674"
      preserveAspectRatio="xMidYMid meet"
      className="vtmn-wordmark-type vtmn-brand-inline"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <img
      src={wordmarkUrl}
      width={1874.98999}
      height={244.5674}
      alt="VTMN"
      className={`vtmn-wordmark vtmn-brand-monochrome ${className}`}
    />
  );
}

export function BrandSymbol() {
  return (
    <img
      src={symbolUrl}
      width={832.88351}
      height={612.71056}
      alt=""
      aria-hidden="true"
      className="vtmn-brand-symbol vtmn-brand-monochrome"
    />
  );
}

export function BrandLockup() {
  return (
    <img
      src={lockupUrl}
      width={1800}
      height={600}
      alt="VTMN — Esse Quam Videri"
      fetchPriority="high"
      className="vtmn-brand-lockup"
    />
  );
}
