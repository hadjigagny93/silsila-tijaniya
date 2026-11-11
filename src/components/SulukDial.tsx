import { PRAYERS, type Prayer } from "@/lib/data/types";
import { formatMinute, type PrayerClock } from "@/lib/suluk";
import { t } from "@/messages/fr";

const SIZE = 640;
const CENTER = SIZE / 2;
// Rayon de l'anneau extérieur, et écart entre deux anneaux concentriques.
const RING = 236;
const STEP = 48;
// Deux points plus proches que cet écart (en minutes) ne tiennent pas sur le même rang.
const CROWDED = 30;

// Cadran de 24 heures : minuit en bas, midi en haut, comme la course du soleil.
function point(minute: number, radius: number) {
  const angle = (minute / 1440) * 2 * Math.PI + Math.PI;
  return { x: CENTER + radius * Math.sin(angle), y: CENTER - radius * Math.cos(angle) };
}

function arc(from: number, to: number, radius: number) {
  const start = point(from, radius);
  const end = point(to, radius);
  const span = (((to - from) % 1440) + 1440) % 1440;
  return `M${start.x} ${start.y}A${radius} ${radius} 0 ${span > 720 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

// minute : début de la séance ; duration : son temps estimé, colorié sur l'anneau.
// arabic : ce qu'il y a à faire, en arabe, une ligne par litanie ; affiché en petit près du point.
export type DialLitany = {
  id: string;
  name: string;
  arabic: string[];
  minute: number;
  duration: number;
  color: string;
  done: boolean;
  // Séance commencée : certaines de ses litanies sont cochées, pas toutes.
  partial?: boolean;
  // Litanies d'une séance, chacune cochable à part (clé « séance#nom »).
  items?: { key: string; label: string; minutes: number; done: boolean }[];
};

// Un anneau du cadran : les litanies à l'extérieur, puis chaque famille d'exercices vers le centre.
export type DialRing = {
  key: string;
  // Titre arabe, posé sur l'anneau, en bas, à minuit.
  title: string;
  label: string;
  litanies: DialLitany[];
};

const LINE = 12;
const MAX_CHARS = 22;
const shorten = (text: string) => (text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text);

// Les points trop proches passent sur un rang intérieur, deux rangs au plus, sans déborder sur l'anneau suivant.
// Le nom d'un point suivi de près s'écarte de son voisin pour rester lisible.
function placeLitanies(litanies: DialLitany[], radius: number) {
  const levels: number[] = [];
  litanies.forEach((litany, index) => {
    const crowded = index > 0 && litany.minute - litanies[index - 1].minute < CROWDED;
    levels.push(crowded ? (levels[index - 1] + 1) % 2 : 0);
  });
  return litanies.map((litany, index) => {
    const dot = point(litany.minute, radius - levels[index] * 20);
    const side: "start" | "middle" | "end" = dot.x > CENTER + 8 ? "end" : dot.x < CENTER - 8 ? "start" : "middle";
    const neighbour = levels[index + 1] ? point(litanies[index + 1].minute, radius - levels[index + 1] * 20) : null;
    const shift = neighbour ? (neighbour.y < dot.y ? 10 : -10) : 0;
    const label =
      side === "middle"
        ? { x: dot.x, y: dot.y + (dot.y < CENTER ? 18 : -18) }
        : { x: dot.x + (side === "end" ? -20 : 20), y: dot.y + shift };
    return { litany, dot, label, side, onRing: levels[index] === 0 };
  });
}

export function SulukDial({
  clock,
  rings,
  now,
  center,
  onToggle,
  label,
}: {
  clock: PrayerClock;
  rings: DialRing[];
  now: number | null;
  center: React.ReactNode;
  onToggle: (litany: DialLitany) => void;
  label: string;
}) {
  const radius = (index: number) => RING - index * STEP;
  const inner = radius(rings.length - 1);
  return (
    <div className="suluk-dial">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={label}>
        <defs>
          <linearGradient id="dial-hand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4d27c" />
            <stop offset="100%" stopColor="#b9862e" />
          </linearGradient>
        </defs>
        {/* Lunette : un double filet doré, les heures en traits fins, les quarts d'heure en points. */}
        <circle className="dial-bezel" cx={CENTER} cy={CENTER} r={RING + 26} />
        <circle className="dial-bezel is-fine" cx={CENTER} cy={CENTER} r={RING + 20} />
        {Array.from({ length: 96 }, (_, quarter) => {
          const hour = quarter % 4 === 0;
          const from = point(quarter * 15, RING + (hour ? 11 : 14));
          const to = point(quarter * 15, RING + (quarter % 24 === 0 ? 24 : hour ? 19 : 16));
          return (
            <line
              key={quarter}
              className={`dial-tick${hour ? " is-hour" : ""}${quarter % 24 === 0 ? " is-cardinal" : ""}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}

        {/* Le jour et la nuit, en deux demi-cercles autour du centre : orange du Chourouq au Maghrib,
            noir du Maghrib au Chourouq. À l'intérieur, pour ne cacher ni les heures ni la lunette. */}
        {(() => {
          const r = rings.length > 0 ? inner - 15 : RING - 30;
          return (
            <g className="dial-sun" aria-hidden>
              <path className="dial-sun-night" d={arc(clock.maghrib, clock.sunrise, r)} />
              <path className="dial-sun-day" d={arc(clock.sunrise, clock.maghrib, r)} />
            </g>
          );
        })()}

        {rings.map((ring, index) => {
          const r = radius(index);
          // Une ouverture en bas de chaque cercle, à minuit, où s'écrit son titre en arabe.
          const gap = (ring.title.length * 3 + 8) / ((2 * Math.PI * r) / 1440);
          return (
            <g key={ring.key}>
              <path className="dial-band" d={arc(gap, 1440 - gap, r)} />
              <path className="dial-track" d={arc(gap, 1440 - gap, r)} />
              {/* Durée de chaque séance, posée sur le cercle, dans sa couleur. */}
              {ring.litanies.map((litany) => (
                <path
                  key={litany.id}
                  className={`dial-span${litany.done ? " is-done" : litany.partial ? " is-partial" : ""}`}
                  d={arc(litany.minute, litany.minute + Math.max(litany.duration, 2), r)}
                  stroke={litany.color}
                />
              ))}
              {/* Au bas du cercle, à l'horizontale : un texte en courbe sépare les lettres arabes dans Safari. */}
              <text className="dial-ring-title" x={point(0, r).x} y={point(0, r).y} lang="ar" aria-label={ring.label}>
                {ring.title}
              </text>
            </g>
          );
        })}

        {PRAYERS.map((prayer: Prayer) => {
          // Le trait de chaque prière traverse tous les cercles, en pointillé.
          const from = point(clock[prayer], inner - 12);
          const to = point(clock[prayer], RING + 26);
          const text = point(clock[prayer], RING + 48);
          return (
            <g key={prayer} className={`dial-prayer${prayer === "sunrise" ? " is-sun" : ""}`}>
              <line className="dial-prayer-rule" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <circle className="dial-prayer-mark" cx={to.x} cy={to.y} r={3.5} />
              <text x={text.x} y={text.y - 8}>
                {t.suluk.prayers[prayer]}
              </text>
              <text className="dial-prayer-time" x={text.x} y={text.y + 9}>
                {formatMinute(clock[prayer])}
              </text>
            </g>
          );
        })}

        {rings.map((ring, index) =>
          placeLitanies(ring.litanies, radius(index)).map(({ litany, dot, label, side, onRing }) => {
            const base = point(litany.minute, radius(index));
            // Sur les anneaux intérieurs, une seule ligne d'arabe pour ne pas déborder sur le voisin.
            const lines = index === 0 ? litany.arabic : litany.arabic.slice(0, 1);
            return (
              <g
                key={litany.id}
                className={`dial-litany${litany.done ? " is-done" : litany.partial ? " is-partial" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={litany.done}
                aria-label={t.suluk.markDone(litany.name)}
                onClick={() => onToggle(litany)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onToggle(litany);
                }}
              >
                <title>{`${formatMinute(litany.minute)} – ${formatMinute((litany.minute + litany.duration) % 1440)} · ${litany.name}`}</title>
                {!onRing && <line className="dial-litany-stem" x1={base.x} y1={base.y} x2={dot.x} y2={dot.y} />}
                <circle className="dial-litany-hit" cx={dot.x} cy={dot.y} r={12} />
                <circle
                  className="dial-litany-dot"
                  cx={dot.x}
                  cy={dot.y}
                  r={7}
                  style={{ "--group-color": litany.color } as React.CSSProperties}
                />
                {litany.done && (
                  <path className="dial-litany-check" d={`M${dot.x - 3.5} ${dot.y + 0.2}l2.4 2.4 4.6-4.8`} />
                )}
                {lines.length > 0 ? (
                  <text className="dial-litany-arabic" x={label.x} y={label.y} textAnchor={side}>
                    {lines.map((line, row) => (
                      <tspan key={row} x={label.x} dy={row === 0 ? (-(lines.length - 1) * LINE) / 2 : LINE}>
                        {shorten(line)}
                      </tspan>
                    ))}
                  </text>
                ) : (
                  <text className="dial-litany-name" x={label.x} y={label.y} textAnchor={side}>
                    {litany.name}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {now !== null && (
          // Une aiguille effilée et dorée, avec son contrepoids ; elle tourne autour du centre.
          <g className="dial-hand" transform={`rotate(${(now / 1440) * 360 + 180} ${CENTER} ${CENTER})`}>
            <path
              className="dial-hand-blade"
              d={`M${CENTER} ${CENTER - RING - 18}L${CENTER + 4.5} ${CENTER - 18}L${CENTER + 3} ${CENTER + 30}L${CENTER - 3} ${CENTER + 30}L${CENTER - 4.5} ${CENTER - 18}Z`}
              fill="url(#dial-hand)"
            />
            <circle className="dial-hand-weight" cx={CENTER} cy={CENTER + 34} r={6} />
            <circle className="dial-hand-tip" cx={CENTER} cy={CENTER - RING + 6} r={4.5} />
            <circle className="dial-hand-pivot" cx={CENTER} cy={CENTER} r={8} fill="url(#dial-hand)" />
            <circle className="dial-hand-cap" cx={CENTER} cy={CENTER} r={3} />
          </g>
        )}
      </svg>
      <div className="dial-center">{center}</div>
    </div>
  );
}
