import Link from "next/link";
import { DegreeThirds } from "@/components/DegreeThirds";
import { Icon } from "@/components/Icon";
import { StationsDial, type StationBead, type StationPoint } from "@/components/StationsDial";
import { StationVerse } from "@/components/StationVerse";
import { getStore } from "@/lib/data";
import type { LitanyGroup } from "@/lib/data/types";
import { syncFocusDegree } from "@/lib/stationDegree";
import { focusDay, stationById, STATIONS } from "@/lib/stations";
import { STATION_VERSES } from "@/lib/stationVerses";
import { t } from "@/messages/fr";

// L'Échiquier, en bas du Suluk : les cent stations en dix cercles, et la station du mois avec sa flamme.
export async function EchiquierSection({
  userId,
  today,
  groups,
}: {
  userId: string;
  today: string;
  groups: LitanyGroup[];
}) {
  const store = getStore();
  // Le degré de la station du mois se calcule d'abord, pour que le cadran montre le degré à jour.
  const computed = await syncFocusDegree(userId, today, groups);
  const [states, moments, focus, journal] = await Promise.all([
    store.listStationStates(userId),
    store.listStationMoments(userId),
    store.getStationFocus(userId),
    store.listJournal(userId, "0000-01-01", today),
  ]);
  const points = new Map<string, StationPoint>(
    STATIONS.map((station) => [station.id, { id: station.id, degree: 0, moments: 0 }]),
  );
  for (const state of states) {
    const point = points.get(state.station);
    if (point) point.degree = state.degree;
  }
  for (const moment of moments) {
    const point = points.get(moment.station);
    if (point) point.moments += 1;
  }
  // Le chemin s'allume jusqu'à la station la plus haute dont un degré est atteint.
  const reached = STATIONS.findLastIndex(
    (station) => station.section.kind === "station" && (points.get(station.id)?.degree ?? 0) >= 2,
  );

  const focused = focus ? stationById(focus.station) : undefined;
  const progress = focus ? focusDay(focus, today) : null;
  const focusState = focused ? states.find((state) => state.station === focused.id) : undefined;
  const repeats = focused ? journal.filter((entry) => entry.key === `verset:${focused.id}`) : [];
  // Taux de chaque journée de la période : ils règlent le pas et l'éclat de la bille.
  const period = computed?.period ?? [];

  // La bille avance d'un pas par jour de la période ; son éclat suit la journée d'aujourd'hui.
  const latest = period[period.length - 1];
  const bead: StationBead | null =
    focus && focused && progress && focused.id !== STATIONS[STATIONS.length - 1].id
      ? {
          steps: focus.days,
          trail: period.map((day) => day.ratio),
          label: latest
            ? t.echiquier.sunLabel(Math.min(progress.day, focus.days), focus.days, latest.done, latest.total)
            : t.echiquier.focusDay(progress.day, focus.days),
        }
      : null;

  return (
    <section id="echiquier" className="suluk-echiquier" aria-label={t.echiquier.title}>
      <p className="eyebrow">{t.echiquier.source}</p>
      <h2 className="page-title">
        {t.echiquier.title}{" "}
        <span className="wird-arabic" lang="ar">
          {t.echiquier.arabic}
        </span>
      </h2>
      <p className="page-intro">{t.echiquier.intro}</p>

      <div className="echiquier-board">
        <div>
          <StationsDial points={points} focus={focus?.station ?? null} reached={reached} bead={bead} />
          <div className="board-legend">
            {t.echiquier.degrees.map((label, degree) => (
              <span key={label}>
                <i className="board-swatch" data-degree={degree} /> {label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">{t.echiquier.ringsLegend}</p>
        </div>

        <div className="echiquier-side">
          {focused && progress ? (
            <div className="focus-row">
              <section className="focus-card" aria-label={t.echiquier.focus}>
                <div className="focus-card-head">
                  <span className="label">{t.echiquier.focus}</span>
                  <span className="text-muted">
                    {progress.finished ? t.echiquier.focusDone : t.echiquier.focusDay(progress.day, focus!.days)}
                  </span>
                </div>
                <div className="focus-card-progress" aria-hidden>
                  <span style={{ width: `${Math.min(100, (progress.day / focus!.days) * 100)}%` }} />
                </div>
                <p className="eyebrow mt-4">
                  <span lang="ar">{focused.section.arabic}</span> · {focused.section.name}
                </p>
                <p className="focus-card-arabic" lang="ar">
                  {focused.arabic}
                </p>
                <p className="station-subtitle">
                  <em>{focused.translit}</em> · {focused.name}
                </p>
                {focused.section.kind === "station" && (
                  <>
                    <p className="mt-1 text-muted">{t.echiquier.degrees[focusState?.degree ?? 0]}</p>
                    {computed && <DegreeThirds thirds={computed.thirds} full={computed.full} days={focus!.days} />}
                  </>
                )}
                <p className="station-text mt-4">{focusState?.explanation ?? focused.explanation}</p>
                <div className="mt-5">
                  <StationVerse
                    station={focused.id}
                    verse={STATION_VERSES[focused.id]}
                    day={today}
                    count={Number(repeats.find((entry) => entry.day === today)?.text ?? 0)}
                    total={repeats.reduce((sum, entry) => sum + Number(entry.text), 0)}
                  />
                </div>
                <Link href={`/echiquier/${focused.id}`} className="button-quiet mt-5">
                  {t.echiquier.open}
                  <Icon name="arrowR" />
                </Link>
              </section>
            </div>
          ) : (
            <p className="suluk-soon-empty">{t.echiquier.noFocus}</p>
          )}
        </div>
      </div>
    </section>
  );
}
