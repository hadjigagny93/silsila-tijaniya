// La flamme du mois, dans l'Échiquier : un brasier. Il grandit avec la somme des journées
// de la période et atteint toute la hauteur de son espace quand chaque jour a été plein (fill de 0 à 1).
// Au plus bas, il ne reste que quelques petites flammes.

// Langues de feu : position, hauteur relative, durée et décalage de leur mouvement.
const TONGUES = [
  { x: 66, h: 0.55, d: 1.3, delay: -0.4 },
  { x: 82, h: 0.8, d: 1.05, delay: -0.9 },
  { x: 96, h: 1, d: 1.6, delay: -0.2 },
  { x: 108, h: 0.9, d: 1.2, delay: -1.1 },
  { x: 122, h: 0.75, d: 0.95, delay: -0.6 },
  { x: 136, h: 0.5, d: 1.4, delay: -1.3 },
  { x: 102, h: 0.65, d: 0.8, delay: -0.3 },
];
const SPARKS = [
  { x: 92, d: 2.6, delay: 0 },
  { x: 104, d: 3.1, delay: -0.8 },
  { x: 116, d: 2.2, delay: -1.6 },
  { x: 86, d: 3.4, delay: -2.1 },
  { x: 110, d: 2.8, delay: -1.1 },
  { x: 98, d: 2.4, delay: -2.6 },
  { x: 122, d: 3, delay: -0.4 },
  { x: 80, d: 2.7, delay: -1.9 },
];

// Une langue de feu, base au point (0, 0), pointe vers le haut.
const TONGUE = "M0 0C-16 -2 -20 -22 -12 -44C-7 -58 -6 -74 -2 -96C4 -80 10 -66 13 -50C19 -26 15 -2 0 0Z";
const TONGUE_CORE = "M0 -2C-8 -3 -10 -14 -5 -28C-3 -36 -1 -44 0.5 -52C3 -42 7 -34 8 -26C10 -14 7 -3 0 -2Z";

export function BigFlame({ fill, label, className = "" }: { fill: number; label: string; className?: string }) {
  const level = Math.max(0, Math.min(1, fill));
  // Les flammes montent avec le cumul.
  const flame = 0.15 + 0.85 * level;
  return (
    <div
      className={`big-flame ${className}`}
      style={{ "--f": level } as React.CSSProperties}
      role="img"
      aria-label={label}
    >
      <div className="big-flame-stage" aria-hidden>
        <svg className="brazier" viewBox="0 0 200 420" preserveAspectRatio="xMidYMax meet">
          <defs>
            <radialGradient id="brazier-glow" cx="50%" cy="85%" r="55%">
              <stop offset="0%" stopColor="#ffb347" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff6a1a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="brazier-tongue" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ffd56b" />
              <stop offset="35%" stopColor="#ff8f1f" />
              <stop offset="75%" stopColor="#e2401a" />
              <stop offset="100%" stopColor="#a81e0e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="brazier-core" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#fffbe8" />
              <stop offset="60%" stopColor="#ffe27a" />
              <stop offset="100%" stopColor="#ffc23d" stopOpacity="0" />
            </linearGradient>
            <filter id="brazier-wave" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="2" seed="7">
                <animate
                  attributeName="baseFrequency"
                  dur="3.1s"
                  repeatCount="indefinite"
                  values="0.018 0.045;0.024 0.06;0.015 0.04;0.018 0.045"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="6" />
            </filter>
          </defs>

          <ellipse className="brazier-glow" cx="100" cy="385" rx="98" ry="80" fill="url(#brazier-glow)" />

          <g className="brazier-flames" filter="url(#brazier-wave)">
            {TONGUES.map((tongue, index) => (
              <g
                key={index}
                transform={`translate(${tongue.x} 396) scale(${0.6 + 1.05 * flame} ${tongue.h * flame * 3.3})`}
              >
                <g
                  className="brazier-tongue"
                  style={{ animationDuration: `${tongue.d}s`, animationDelay: `${tongue.delay}s` }}
                >
                  <path d={TONGUE} fill="url(#brazier-tongue)" />
                  <path d={TONGUE_CORE} fill="url(#brazier-core)" />
                </g>
              </g>
            ))}
          </g>

          {SPARKS.map((spark, index) => (
            <circle
              key={index}
              className="brazier-spark"
              cx={spark.x}
              cy={380}
              r={1.6}
              style={{ animationDuration: `${spark.d}s`, animationDelay: `${spark.delay}s` }}
            />
          ))}
        </svg>
      </div>
      <p className="big-flame-label">{label}</p>
    </div>
  );
}
