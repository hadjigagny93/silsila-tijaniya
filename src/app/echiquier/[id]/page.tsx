import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addStationMoment,
  clearStationFocus,
  deleteStationMoment,
  saveStationExplanation,
  saveStationNote,
  setStationFocus,
} from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DegreeThirds } from "@/components/DegreeThirds";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { StationVerse } from "@/components/StationVerse";
import { getStore } from "@/lib/data";
import { syncFocusDegree } from "@/lib/stationDegree";
import { FOCUS_LENGTHS, focusDay, stationById } from "@/lib/stations";
import { STATION_VERSES } from "@/lib/stationVerses";
import { formatDay, todayKey } from "@/lib/suluk";
import { loadSuluk } from "@/lib/sulukData";
import { t } from "@/messages/fr";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const station = stationById((await params).id);
  return { title: station ? `${station.name} · ${t.echiquier.title}` : t.echiquier.title };
}

const formatAt = (at: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(at.replace(" ", "T")));

export default async function StationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const station = stationById((await params).id);
  if (!station) notFound();
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  const { ok, erreur } = await searchParams;

  const { settings, groups } = await loadSuluk(session.userId);
  const today = todayKey(settings.timezone);
  // Le degré de la station du mois se calcule avant tout, à partir des jours pleins de Suluk.
  const computed = await syncFocusDegree(session.userId, today, groups);
  const [states, history, moments, focus, journal] = await Promise.all([
    store.listStationStates(session.userId),
    store.listStationHistory(session.userId, station.id),
    store.listStationMoments(session.userId),
    store.getStationFocus(session.userId),
    store.listJournal(session.userId, "0000-01-01", today),
  ]);
  const repeats = journal.filter((entry) => entry.key === `verset:${station.id}`);
  const todayRepeats = Number(repeats.find((entry) => entry.day === today)?.text ?? 0);
  const totalRepeats = repeats.reduce((sum, entry) => sum + Number(entry.text), 0);
  const state = states.find((item) => item.station === station.id);
  const degree = state?.degree ?? 0;
  const mine = moments.filter((moment) => moment.station === station.id);
  const isFocus = focus?.station === station.id;
  const progress = isFocus ? focusDay(focus!, today) : null;
  const kind = station.section.kind;

  return (
    <div className="max-w-3xl">
      <Link href="/suluk#echiquier" className="back-link">
        <Icon name="arrowL" />
        {t.echiquier.back}
      </Link>
      <p className="eyebrow mt-4">
        <span lang="ar">{station.section.arabic}</span> · {station.section.name}
      </p>
      <h1 className="station-title">
        <span lang="ar">{station.arabic}</span>
      </h1>
      <p className="station-subtitle">
        <em>{station.translit}</em> · {station.name}
      </p>
      {ok && <Notice tone="success">{t.echiquier.saved}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}

      <section className="panel mt-6">
        <h2 className="panel-title">{state?.explanation ? t.echiquier.personal : t.echiquier.explanation}</h2>
        <p className="station-text">{state?.explanation ?? station.explanation}</p>
        <details className="mt-3">
          <summary className="button-quiet w-fit cursor-pointer list-none">
            <Icon name="edit" />
            {t.echiquier.editExplanation}
          </summary>
          <form action={saveStationExplanation} className="mt-3 grid gap-2">
            <input type="hidden" name="station" value={station.id} />
            <textarea name="explanation" rows={4} maxLength={4000} defaultValue={state?.explanation ?? station.explanation} className="field" />
            <span className="field-hint">{t.echiquier.explanationHint}</span>
            <div>
              <button className="button">{t.echiquier.save}</button>
            </div>
          </form>
        </details>
      </section>

      <section className="panel mt-4">
        <h2 className="panel-title">{t.echiquier.verse}</h2>
        <StationVerse station={station.id} verse={STATION_VERSES[station.id]} day={today} count={todayRepeats} total={totalRepeats} />
        <p className="mt-3 text-sm text-muted">{t.echiquier.verseNote}</p>
      </section>

      {kind === "station" && (
        <section className="panel mt-4">
          <h2 className="panel-title">{t.echiquier.whereAmI}</h2>
          <p className="degree-current">
            <i className="board-swatch" data-degree={degree} /> <strong>{t.echiquier.degrees[degree]}</strong>
            <span className="text-muted"> · {t.echiquier.degreeHints[degree]}</span>
          </p>
          {isFocus && computed ? (
            <DegreeThirds thirds={computed.thirds} full={computed.full} days={focus!.days} />
          ) : (
            <p className="mt-2 text-sm text-muted">{t.echiquier.degreeByTime}</p>
          )}
          <form action={saveStationNote} className="mt-4 grid gap-3">
            <input type="hidden" name="station" value={station.id} />
            <label className="block">
              <span className="field-label">{t.echiquier.note}</span>
              <textarea name="note" rows={3} maxLength={4000} defaultValue={state?.note ?? ""} placeholder={t.echiquier.notePlaceholder} className="field" />
            </label>
            <div>
              <button className="button">{t.echiquier.save}</button>
            </div>
          </form>
        </section>
      )}

      {kind !== "station" && (
        <section className="panel mt-4">
          <p className="text-muted">{kind === "state" ? t.echiquier.stateKind : t.echiquier.horizonKind}</p>
          {kind === "horizon" && (
            <form action={saveStationNote} className="mt-4 grid gap-3">
              <input type="hidden" name="station" value={station.id} />
              <label className="block">
                <span className="field-label">{t.echiquier.note}</span>
                <textarea name="note" rows={3} maxLength={4000} defaultValue={state?.note ?? ""} placeholder={t.echiquier.notePlaceholder} className="field" />
              </label>
              <div>
                <button className="button">{t.echiquier.save}</button>
              </div>
            </form>
          )}
        </section>
      )}

      {kind === "state" && (
        <section className="panel mt-4">
          <h2 className="panel-title">{t.echiquier.moments}</h2>
          <form action={addStationMoment} className="grid gap-3">
            <input type="hidden" name="station" value={station.id} />
            <div className="litany-form-row">
              <label className="block flex-1">
                <span className="field-label">{t.echiquier.momentDay}</span>
                <input type="date" name="day" max={today} defaultValue={today} className="field" />
              </label>
            </div>
            <textarea name="text" rows={3} required maxLength={4000} placeholder={t.echiquier.momentPlaceholder} className="field" />
            <div>
              <button className="button">{t.echiquier.addMoment}</button>
            </div>
          </form>
          <ul className="station-list mt-4">
            {mine.length === 0 && <li className="text-muted">{t.echiquier.noMoments}</li>}
            {mine.map((moment) => (
              <li key={moment.id} className="station-moment">
                <span className="min-w-0 flex-1">
                  <span className="wird-name first-letter:uppercase">{formatDay(moment.day)}</span>
                  <span className="station-moment-text">{moment.text}</span>
                </span>
                <form action={deleteStationMoment}>
                  <input type="hidden" name="station" value={station.id} />
                  <input type="hidden" name="id" value={moment.id} />
                  <ConfirmButton message={t.echiquier.deleteMomentConfirm} className="button-danger">
                    <Icon name="trash" />
                    {t.echiquier.deleteMoment}
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel mt-4">
        <h2 className="panel-title">{t.echiquier.focus}</h2>
        {isFocus && progress ? (
          <>
            <p className="wird-name">{progress.finished ? t.echiquier.focusDone : t.echiquier.focusDay(progress.day, focus!.days)}</p>
            <form action={clearStationFocus} className="mt-3">
              <input type="hidden" name="station" value={station.id} />
              <button className="button-quiet">{t.echiquier.stopFocus}</button>
            </form>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {FOCUS_LENGTHS.map((days) => (
              <form key={days} action={setStationFocus}>
                <input type="hidden" name="station" value={station.id} />
                <input type="hidden" name="days" value={days} />
                <button className="button-quiet">{t.echiquier.makeFocus(days)}</button>
              </form>
            ))}
          </div>
        )}
      </section>

      {kind === "station" && (
        <section className="panel mt-4">
          <h2 className="panel-title">{t.echiquier.history}</h2>
          {history.length === 0 ? (
            <p className="text-muted">{t.echiquier.noHistory}</p>
          ) : (
            <ol className="station-list">
              {history.map((change, index) => (
                <li key={`${change.at}-${index}`} className="station-change">
                  <i className="board-swatch" data-degree={change.degree} />
                  <span className="wird-name">{t.echiquier.degrees[change.degree]}</span>
                  <span className="text-muted">{formatAt(change.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
