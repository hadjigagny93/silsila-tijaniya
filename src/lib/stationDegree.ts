import { getStore } from "./data";
import type { LitanyGroup } from "./data/types";
import { periodCompletion } from "./progress";
import { stationById } from "./stations";

// Le degré d'une station se gagne avec le temps : la période de la station du mois est coupée en trois tiers.
// Chaque tiers accompli (assez de jours pleins de Suluk, en cumul) fait monter d'un degré.
// Une période de 30 jours : 10 jours pleins pour le 1er degré, 20 pour le 2e, 30 pour le 3e.
export const THIRDS = 3;

// Degré atteint pour un cumul de jours pleins : 1 « je m'y exerce » tant qu'aucun tiers n'est accompli, puis 2, 3, 4.
export function degreeFromPeriod(full: number, days: number) {
  const third = days / THIRDS;
  return 1 + Math.min(THIRDS, Math.floor(full / third + 1e-9));
}

// Avancée de chacun des trois tiers, de 0 à 1.
export function thirdsProgress(full: number, days: number) {
  const third = days / THIRDS;
  return Array.from({ length: THIRDS }, (_, index) => Math.max(0, Math.min(1, (full - index * third) / third)));
}

// Calcule le degré de la station du mois et l'enregistre s'il est plus haut que celui déjà acquis :
// un degré gagné reste, même quand la période est finie ou qu'une autre station prend le relais.
export async function syncFocusDegree(userId: string, today: string, groups: LitanyGroup[]) {
  const store = getStore();
  const focus = await store.getStationFocus(userId);
  const station = focus ? stationById(focus.station) : undefined;
  if (!focus || !station) return null;
  const [exercises, entries] = await Promise.all([
    store.listExercises(userId),
    store.listWird(userId, focus.start, today),
  ]);
  const period = periodCompletion(focus, today, groups, exercises, entries);
  const full = period.reduce((sum, day) => sum + day.ratio, 0);
  const degree = degreeFromPeriod(full, focus.days);
  if (station.section.kind === "station") {
    const current = (await store.listStationStates(userId)).find((state) => state.station === station.id);
    if (degree > (current?.degree ?? 0)) {
      await store.saveStationState(userId, {
        station: station.id,
        degree,
        note: current?.note ?? null,
        explanation: current?.explanation ?? null,
      });
    }
  }
  return { focus, station, period, full, degree, thirds: thirdsProgress(full, focus.days) };
}
