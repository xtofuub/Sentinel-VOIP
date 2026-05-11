export const LogoMark = ({ size = 28, animated = true }) => (
  <span style={{
    width: size, height: size, borderRadius: size * 0.26,
    background: "linear-gradient(135deg, oklch(0.30 0.020 30) 0%, oklch(0.18 0.012 30) 100%)",
    border: "1px solid oklch(0.36 0.014 30)",
    display: "inline-grid", placeItems: "center",
    boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 22px -8px var(--accent-glow)",
    position: "relative", flexShrink: 0, overflow: "hidden",
  }}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lg-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="var(--accent)"/>
        </linearGradient>
      </defs>
      <g fill="url(#lg-bar)">
        <rect x="2" y="10" width="2.6" height="4" rx="1.3">
          {animated && <animate attributeName="height" values="4;12;4" dur="1.4s" repeatCount="indefinite" begin="0s"/>}
          {animated && <animate attributeName="y" values="10;6;10" dur="1.4s" repeatCount="indefinite" begin="0s"/>}
        </rect>
        <rect x="6.4" y="7" width="2.6" height="10" rx="1.3">
          {animated && <animate attributeName="height" values="10;16;10" dur="1.4s" repeatCount="indefinite" begin="0.15s"/>}
          {animated && <animate attributeName="y" values="7;4;7" dur="1.4s" repeatCount="indefinite" begin="0.15s"/>}
        </rect>
        <rect x="10.8" y="4" width="2.6" height="16" rx="1.3">
          {animated && <animate attributeName="height" values="16;20;16" dur="1.4s" repeatCount="indefinite" begin="0.30s"/>}
          {animated && <animate attributeName="y" values="4;2;4" dur="1.4s" repeatCount="indefinite" begin="0.30s"/>}
        </rect>
        <rect x="15.2" y="7" width="2.6" height="10" rx="1.3">
          {animated && <animate attributeName="height" values="10;14;10" dur="1.4s" repeatCount="indefinite" begin="0.45s"/>}
          {animated && <animate attributeName="y" values="7;5;7" dur="1.4s" repeatCount="indefinite" begin="0.45s"/>}
        </rect>
        <rect x="19.6" y="10" width="2.6" height="4" rx="1.3">
          {animated && <animate attributeName="height" values="4;8;4" dur="1.4s" repeatCount="indefinite" begin="0.60s"/>}
          {animated && <animate attributeName="y" values="10;8;10" dur="1.4s" repeatCount="indefinite" begin="0.60s"/>}
        </rect>
      </g>
    </svg>
  </span>
);

export const Wordmark = ({ size = 16 }) => (
  <span style={{ fontFamily: "var(--font-display)", fontSize: size, fontWeight: 600, letterSpacing: "-0.022em", color: "var(--ink)" }}>
    Sentinel<span style={{ color: "var(--accent)", margin: "0 1px", fontWeight: 500 }}>·</span>VOIP
  </span>
);
