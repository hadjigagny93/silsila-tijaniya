import { StationsDial, type StationBead, type StationPoint } from "@/components/StationsDial";
import { getStore } from "@/lib/data";
import type { LitanyGroup } from "@/lib/data/types";
import { syncFocusDegree } from "@/lib/stationDegree";
import { focusDay, stationById, STATIONS } from "@/lib/stations";
import { t } from "@/messages/fr";

// L'Échiquier, en bas du Suluk : les cent stations en dix cercles. La station du mois a sa propre page (/suluk/station).
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
  const [states, moments, focus] = await Promise.all([
    store.listStationStates(userId),
    store.listStationMoments(userId),
    store.getStationFocus(userId),
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

      <div className="echiquier-board is-single">
        <div>
          <StationsDial points={points} focus={focus?.station ?? null} reached={reached} bead={bead} />
          <p className="mt-2 text-sm text-muted">{t.echiquier.ringsLegend}</p>
        </div>
      </div>
    </section>
  );
}
