// Le sablier du jour : tout le temps assigné aux litanies et aux exercices est dans le bulbe du haut ;
// le sable descend à mesure que les œuvres sont accomplies (ratio de 0 à 1).
const TOP = 8;
const NECK = 45;
const BOTTOM = 82;
const BULB = NECK - TOP;

const GLASS = "M10 8H50C50 30 33 38 31 45C33 52 50 60 50 82H10C10 60 27 52 29 45C27 38 10 30 10 8Z";
const UPPER = "M10 8H50C50 30 33 38 31 45H29C27 38 10 30 10 8Z";
const LOWER = "M29 45H31C33 52 50 60 50 82H10C10 60 27 52 29 45Z";

export function Hourglass({ ratio, label, className = "" }: { ratio: number; label: string; className?: string }) {
  const level = Math.max(0, Math.min(1, ratio));
  // Le bulbe se rétrécit vers le col : on règle la hauteur du sable sur la racine du taux
  // pour que la quantité qui reste en haut suive à peu près ce qui reste à faire.
  const upper = BULB * Math.sqrt(1 - level);
  const lower = BULB * (1 - Math.sqrt(1 - level));
  const flowing = level > 0 && level < 1;
  return (
    <div className={`hourglass ${className}`} role="img" aria-label={label}>
      <svg viewBox="0 0 60 90" aria-hidden>
        <defs>
          <clipPath id="hourglass-upper">
            <path d={UPPER} />
          </clipPath>
          <clipPath id="hourglass-lower">
            <path d={LOWER} />
          </clipPath>
          <linearGradient id="hourglass-sand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f3d488" />
            <stop offset="100%" stopColor="#c8932f" />
          </linearGradient>
        </defs>
        <path className="hourglass-glass" d={GLASS} />
        <rect
          clipPath="url(#hourglass-upper)"
          x={0}
          y={NECK - upper}
          width={60}
          height={upper}
          fill="url(#hourglass-sand)"
        />
        {/* Le sable accompli s'entasse en bas, en petit monticule. */}
        <path
          clipPath="url(#hourglass-lower)"
          d={`M0 ${BOTTOM}V${BOTTOM - lower + 3}Q30 ${BOTTOM - lower - 4} 60 ${BOTTOM - lower + 3}V${BOTTOM}Z`}
          fill="url(#hourglass-sand)"
          opacity={level > 0 ? 1 : 0}
        />
        {flowing && <line className="hourglass-stream" x1={30} y1={NECK - 1} x2={30} y2={BOTTOM - lower} />}
        <rect className="hourglass-frame" x={6} y={3} width={48} height={5} rx={2} />
        <rect className="hourglass-frame" x={6} y={82} width={48} height={5} rx={2} />
      </svg>
      <p className="hourglass-label">{label}</p>
    </div>
  );
}
