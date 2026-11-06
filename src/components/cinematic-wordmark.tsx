import { ACTIVATIONS, WORDMARK_VIEWBOX } from "@/lib/cinematic-contacts";

/** Source polygons, original viewport fit; only temporary contact masks differ. */
export function CinematicWordmark({ idPrefix }: { idPrefix: string }) {
  const gradient = `${idPrefix}-activation-feather`;
  return (
    <svg viewBox="0 0 1000 220" className="vtmn-cinematic-wordmark">
      <svg
        x="0"
        y="0"
        width="1000"
        height="220"
        viewBox={WORDMARK_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={gradient}>
            <stop offset="0.8" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {ACTIVATIONS.map((fragment) => (
            <mask
              key={fragment.id}
              id={`${idPrefix}-${fragment.id}-mask`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1874.98999"
              height="244.5674"
              style={{ maskType: "alpha" }}
            >
              <circle
                data-contact-mask={fragment.id}
                cx={fragment.origin[0]}
                cy={fragment.origin[1]}
                r="0"
                fill={`url(#${gradient})`}
              />
            </mask>
          ))}
        </defs>
        {ACTIVATIONS.map((fragment) => (
          <g key={fragment.id}>
            <polygon
              data-contact-fragment={fragment.id}
              id={`${idPrefix}-${fragment.id}`}
              points={fragment.pointsText}
              fill="currentColor"
              mask={`url(#${idPrefix}-${fragment.id}-mask)`}
            />
            <polygon
              data-contact-outline={fragment.id}
              points={fragment.pointsText}
              className="vtmn-cinematic-contact-outline"
              opacity="0"
            />
          </g>
        ))}
      </svg>
    </svg>
  );
}
