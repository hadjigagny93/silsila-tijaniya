// La flamme du jour, dans Suluk : une flamme de bougie, seule. Elle grandit et éclaire d'autant plus
// que le temps assigné dans Suluk a été accompli aujourd'hui (intensity de 0 à 1).
// Le mouvement vient d'une ondulation SVG (turbulence animée) et d'un balancement CSS irrégulier.
export function Flame({ intensity, label, className = "" }: { intensity: number; label: string; className?: string }) {
  const level = Math.max(0, Math.min(1, intensity));
  // Une petite flamme à 0 %, une belle flamme à 100 %.
  const scale = 0.3 + 0.95 * level;
  return (
    <div className={`flame ${className}`} style={{ "--i": level } as React.CSSProperties} role="img" aria-label={label}>
      <svg className="candle" viewBox="0 0 60 72" aria-hidden>
        <defs>
          <radialGradient id="candle-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffcf6b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff9a2e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="candle-flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#4a6dff" stopOpacity="0.85" />
            <stop offset="12%" stopColor="#ffd36b" />
            <stop offset="55%" stopColor="#ff9a24" />
            <stop offset="100%" stopColor="#ff5a12" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="candle-core" cx="50%" cy="75%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fff2b0" stopOpacity="0" />
          </radialGradient>
          <filter id="candle-wave" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035 0.12" numOctaves="2" seed="3">
              <animate
                attributeName="baseFrequency"
                dur="2.3s"
                repeatCount="indefinite"
                values="0.035 0.12;0.045 0.16;0.03 0.1;0.035 0.12"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="3.5" />
          </filter>
        </defs>

        <circle className="candle-halo" cx="30" cy="48" r="28" fill="url(#candle-glow)" />
        <g transform={`translate(30 62) scale(${scale})`}>
          <g className="candle-sway">
            <g className="candle-flicker" filter="url(#candle-wave)">
              <path
                d="M0 0C-8 -1 -10.5 -11 -6 -22C-3.5 -28 -1 -36 0 -44C2 -36 5 -29 7 -22C11 -11 8 -1 0 0Z"
                fill="url(#candle-flame)"
              />
              <path
                d="M0 -2C-4 -3 -4.5 -9 -1.5 -16C-0.5 -19 0 -22 0.4 -25C1.6 -20 3.6 -16 4 -12C5 -6 3 -2 0 -2Z"
                fill="url(#candle-core)"
              />
            </g>
          </g>
        </g>
      </svg>
      <p className="flame-label">{label}</p>
    </div>
  );
}
