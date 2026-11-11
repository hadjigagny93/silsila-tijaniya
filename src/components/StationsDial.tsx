import { SECTIONS } from "@/lib/stations";
import { t } from "@/messages/fr";

const SIZE = 760;
const CENTER = SIZE / 2;
// Les débuts sur le cercle extérieur, les fins sur le cercle intérieur.
const OUTER = 336;
const STEP = 28;

export type StationPoint = {
  id: string;
  degree: number;
  moments: number;
};

const radius = (section: number) => OUTER - section * STEP;

// Station n (de 0 à 99) : dix par cercle, tous les 33°, et chaque cercle décalé de 3,6°,
// si bien que les cent stations dessinent une spirale qui descend vers le centre.
// En haut de chaque cercle, une ouverture d'environ 30° garde la place de son nom.
const SPACING = 33;
const angleOf = (section: number, index: number) => 12 + section * 3.6 + index * SPACING;

function place(section: number, index: number) {
  const angle = (angleOf(section, index) * Math.PI) / 180;
  const r = radius(section);
  return { x: CENTER + r * Math.sin(angle), y: CENTER - r * Math.cos(angle) };
}

// Place d'écriture sur un cercle, de from à to (en degrés) : le texte est posé au milieu, tourné dans le sens
// du cercle, et retourné en bas du cadran pour rester à l'endroit. (Un texte le long d'une courbe, textPath,
// sépare les lettres arabes dans Safari, donc sur l'iPhone.)
function textArc(section: number, from: number, to: number) {
  const r = radius(section);
  const middle = ((((from + to) / 2) % 360) + 360) % 360;
  const flipped = middle > 90 && middle < 270;
  const angle = (middle * Math.PI) / 180;
  return {
    x: CENTER + r * Math.sin(angle),
    y: CENTER - r * Math.cos(angle),
    rotate: flipped ? middle - 180 : middle,
    length: (2 * Math.PI * r * (to - from)) / 360,
    flipped,
  };
}

// Le nom d'une station s'écrit entre son point et le suivant.
const labelArc = (section: number, index: number) =>
  textArc(section, angleOf(section, index) + 4, angleOf(section, index) + SPACING - 4);

export type StationBead = {
  // Nombre de jours de la période, et un taux par jour écoulé (de 0 à 1) ; le dernier est aujourd'hui.
  steps: number;
  trail: number[];
  label: string;
};

// Position entre la station du mois et la suivante : sur le même cercle, la bille suit l'arc ;
// après la dixième station, elle glisse vers le cercle suivant.
function between(section: number, index: number, ratio: number) {
  const last = index === 9;
  const nextSection = last ? Math.min(section + 1, SECTIONS.length - 1) : section;
  const from = angleOf(section, index);
  const to = last ? angleOf(nextSection, 0) + 360 : angleOf(section, index + 1);
  const angle = ((from + (to - from) * ratio) * Math.PI) / 180;
  const r = radius(section) + (radius(nextSection) - radius(section)) * ratio;
  return { x: CENTER + r * Math.sin(angle), y: CENTER - r * Math.cos(angle) };
}

// Les cent stations d'al-Harawī en dix cercles concentriques. Le chemin parcouru s'allume en or
// jusqu'à la station atteinte ; la station du mois porte un halo.
export function StationsDial({
  points,
  focus,
  reached,
  bead,
}: {
  points: Map<string, StationPoint>;
  focus: string | null;
  // Rang (0 à 99) de la station la plus haute atteinte, ou -1.
  reached: number;
  // La bille de la station du mois : elle avance d'un pas par jour vers la station suivante,
  // et brille d'autant plus que la journée de Suluk a été remplie.
  bead: StationBead | null;
}) {
  const all = SECTIONS.flatMap((section, s) => section.stations.map((station, i) => ({ station, section, s, i })));
  const spiral = all.map(({ s, i }) => place(s, i));
  // Le chemin suit chaque cercle d'une station à l'autre ; après la dixième, il continue sur l'arc
  // jusqu'au-dessus de la première station du cercle suivant, puis descend droit vers elle.
  const path = (until: number) =>
    spiral
      .slice(0, until + 1)
      .map((p, index) => {
        const at = `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        if (!index) return `M${at}`;
        const ring = all[index].s;
        const previous = all[index - 1].s;
        const r = radius(previous);
        if (ring === previous) return `A${r} ${r} 0 0 1 ${at}`;
        const angle = (angleOf(ring, 0) * Math.PI) / 180;
        const corner = { x: CENTER + r * Math.sin(angle), y: CENTER - r * Math.cos(angle) };
        return `A${r} ${r} 0 0 1 ${corner.x.toFixed(1)} ${corner.y.toFixed(1)}L${at}`;
      })
      .join("");
  const total = all.filter(
    ({ station, section }) => section.kind === "station" && (points.get(station.id)?.degree ?? 0) >= 2,
  ).length;

  return (
    <div className="stations-dial">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={t.echiquier.title}>
        <defs>
          <radialGradient id="bead-core" cx="40%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#fffbe8" />
            <stop offset="45%" stopColor="#ffd866" />
            <stop offset="100%" stopColor="#e38b1c" />
          </radialGradient>
          <radialGradient id="bead-glow">
            <stop offset="0%" stopColor="#ffd25a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff9a2e" stopOpacity="0" />
          </radialGradient>
        </defs>
        {SECTIONS.map((section, s) => (
          <circle
            key={section.key}
            className={`stations-ring is-${section.kind}`}
            cx={CENTER}
            cy={CENTER}
            r={radius(s)}
          />
        ))}
        <path className="stations-spiral" d={path(all.length - 1)} />
        {reached >= 0 && <path className="stations-spiral is-reached" d={path(reached)} />}

        {all.map(({ station, section, s, i }, n) => {
          const p = place(s, i);
          const point = points.get(station.id);
          const degree = section.kind === "station" ? (point?.degree ?? 0) : 0;
          const status =
            section.kind === "station"
              ? t.echiquier.degrees[degree]
              : section.kind === "state"
                ? t.echiquier.momentsCount(point?.moments ?? 0)
                : t.echiquier.horizonShort;
          return (
            <a
              key={station.id}
              href={`/echiquier/${station.id}`}
              className={`stations-point is-${section.kind}${focus === station.id ? " is-focus" : ""}${n <= reached ? " is-on-path" : ""}`}
              data-degree={section.kind === "station" ? degree : undefined}
              data-lived={section.kind === "state" && (point?.moments ?? 0) > 0 ? "" : undefined}
            >
              <title>{`${n + 1}. ${station.arabic} · ${station.name} — ${status}`}</title>
              {focus === station.id && <circle className="stations-halo" cx={p.x} cy={p.y} r={15} />}
              <circle className="stations-hit" cx={p.x} cy={p.y} r={12} />
              <circle className="stations-dot" cx={p.x} cy={p.y} r={focus === station.id ? 8.5 : 6.5} />
              {(() => {
                const label = labelArc(s, i);
                // La taille suit la place disponible : plus petite vers le centre.
                const size = Math.max(7, Math.min(11.5, label.length / (station.arabic.length * 0.62)));
                return (
                  <text
                    className="stations-name"
                    style={{ fontSize: `${size.toFixed(1)}px` }}
                    x={label.x}
                    y={label.y}
                    transform={`rotate(${label.rotate.toFixed(1)} ${label.x.toFixed(1)} ${label.y.toFixed(1)})`}
                    lang="ar"
                  >
                    {station.arabic}
                  </text>
                );
              })()}
            </a>
          );
        })}

        {bead &&
          focus &&
          (() => {
            const spot = all.find(({ station }) => station.id === focus);
            if (!spot) return null;
            const step = (day: number) => Math.min(day + 1, bead.steps) / bead.steps;
            const today = bead.trail.length - 1;
            const glow = bead.trail[today] ?? 0;
            const here = between(spot.s, spot.i, step(Math.max(0, today)));
            return (
              <g className="stations-bead" aria-label={bead.label}>
                {bead.trail.slice(0, -1).map((ratio, day) => {
                  const p = between(spot.s, spot.i, step(day));
                  return (
                    <circle
                      key={day}
                      className="stations-bead-trace"
                      cx={p.x}
                      cy={p.y}
                      r={2.2}
                      style={{ opacity: 0.35 + 0.65 * ratio }}
                    />
                  );
                })}
                <title>{bead.label}</title>
                <circle
                  className="stations-bead-glow"
                  cx={here.x}
                  cy={here.y}
                  r={7 + 13 * glow}
                  style={{ opacity: 0.15 + 0.7 * glow }}
                />
                <circle
                  className="stations-bead-core"
                  cx={here.x}
                  cy={here.y}
                  r={5.5}
                  style={{
                    opacity: 0.7 + 0.3 * glow,
                    filter: `saturate(${0.25 + 0.75 * glow}) brightness(${0.75 + 0.45 * glow})`,
                  }}
                />
              </g>
            );
          })()}

        {/* Chaque cercle porte son nom dans l'ouverture du haut, avant sa première station. */}
        {SECTIONS.map((section, s) => {
          const title = textArc(s, angleOf(s, 9) + SPACING - 1, angleOf(s, 0) + 359);
          return (
            <text
              key={section.key}
              className="stations-ring-title"
              x={title.x}
              y={title.y}
              transform={`rotate(${title.rotate.toFixed(1)} ${title.x.toFixed(1)} ${title.y.toFixed(1)})`}
              lang="ar"
            >
              {section.arabic}
            </text>
          );
        })}
      </svg>
      <div className="stations-center">
        <span lang="ar" className="stations-center-arabic">
          {t.echiquier.arabic}
        </span>
        <span className="stations-center-count">{t.echiquier.reachedCount(total)}</span>
      </div>
    </div>
  );
}
