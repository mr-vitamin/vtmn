const corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

/** Static decoration; the four original corner anchors remain the foundation. */
export function ArchitecturalFrame() {
  return (
    <div className="vtmn-architectural-frame" aria-hidden="true">
      {corners.map((corner, index) => (
        <div key={corner} className={`vtmn-frame-corner vtmn-frame-${corner}`}>
          <span className="vtmn-frame-anchor" />
          <svg
            className="vtmn-frame-network"
            viewBox="0 0 256 128"
            width="256"
            height="128"
            focusable="false"
          >
            <g className="vtmn-frame-primary">
              <path d="M32 0H144L160 16H196" />
              <path d="M0 32V80L12 92H64" />
              <path d="M0 48H12L24 60V88" />
            </g>
            <g className="vtmn-frame-secondary">
              <path d="M0 8H8V72M8 8H128L144 24H184" />
              <path d="M196 16H224L240 32H256" />
              <path d={`M64 92H${index % 2 ? 80 : 88}V84H108`} />
              <path d="M72 0V7M112 8V15" />
            </g>
            {(index === 0 || index === 3) && (
              <path className="vtmn-frame-accent" d="M144 0L160 16H176" />
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}
