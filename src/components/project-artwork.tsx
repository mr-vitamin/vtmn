/** Neutral archive artwork, not a cover, product image, screenshot, or logo. */
export function ProjectArtwork({ variant = 0 }: { variant?: number }) {
  return (
    <svg
      viewBox="0 0 640 400"
      className="vtmn-project-placeholder"
      data-project-placeholder=""
      data-variant={variant}
      aria-hidden="true"
      focusable="false"
    >
      <g className="vtmn-artwork-register">
        <path d="M32 112V32H112M528 32H608V112M608 288V368H528M112 368H32V288" />
        <path d="M160 32H480M160 368H480M32 160V240M608 160V240" />
        <path d="M320 32V56M320 344V368M32 200H56M584 200H608" />
      </g>
      <g className="vtmn-artwork-object">
        <path className="vtmn-artwork-base" d="M112 256L268 100H524L368 256Z" />
        <path className="vtmn-artwork-edge" d="M112 256V280H368L524 124V100M368 256V280" />
        <path className="vtmn-artwork-inset" d="M174 232L282 124H462L354 232Z" />
        <path d="M222 232L330 124M270 232L378 124M318 232L426 124" />
        <path className="vtmn-artwork-accent" d="M112 256L160 208M368 280H408L456 232" />
      </g>
    </svg>
  );
}
