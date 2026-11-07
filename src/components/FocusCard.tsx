import Link from "next/link";
import { DegreeThirds } from "@/components/DegreeThirds";
import { Icon } from "@/components/Icon";
import { StationVerse } from "@/components/StationVerse";
import { getStore } from "@/lib/data";
import type { LitanyGroup } from "@/lib/data/types";
import { syncFocusDegree } from "@/lib/stationDegree";
import { focusDay, stationById } from "@/lib/stations";
import { STATION_VERSES } from "@/lib/stationVerses";
import { t } from "@/messages/fr";

// La carte de la station du mois : où en est la période, le degré et ses trois tiers, l'explication et le verset.
export async function FocusCard({ userId, today, groups }: { userId: string; today: string; groups: LitanyGroup[] }) {
  const store = getStore();
  const computed = await syncFocusDegree(userId, today, groups);
  const [states, focus, journal] = await Promise.all([
    store.listStationStates(userId),
    store.getStationFocus(userId),
    store.listJournal(userId, "0000-01-01", today),
  ]);
  const focused = focus ? stationById(focus.station) : undefined;
  if (!focus || !focused) return <p className="suluk-soon-empty">{t.echiquier.noFocus}</p>;
  const progress = focusDay(focus, today);
  const focusState = states.find((state) => state.station === focused.id);
  const repeats = journal.filter((entry) => entry.key === `verset:${focused.id}`);

  return (
    <section className="focus-card" aria-label={t.echiquier.focus}>
      <div className="focus-card-head">
        <span className="label">{t.echiquier.focus}</span>
        <span className="text-muted">
          {progress.finished ? t.echiquier.focusDone : t.echiquier.focusDay(progress.day, focus.days)}
        </span>
      </div>
      <div className="focus-card-progress" aria-hidden>
        <span style={{ width: `${Math.min(100, (progress.day / focus.days) * 100)}%` }} />
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
          {computed && <DegreeThirds thirds={computed.thirds} full={computed.full} days={focus.days} />}
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
  );
}
