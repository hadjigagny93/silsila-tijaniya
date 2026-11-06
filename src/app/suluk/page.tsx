import type { Metadata } from "next";
import Link from "next/link";
import { EchiquierSection } from "@/components/EchiquierSection";
import { Icon } from "@/components/Icon";
import { SulukClock } from "@/components/SulukClock";
import { SulukNext } from "@/components/SulukNext";
import { SulukToday } from "@/components/SulukToday";
import { getStore } from "@/lib/data";
import { addDays, formatDay, isWirdDay, todayKey } from "@/lib/suluk";
import { focusDay, stationById } from "@/lib/stations";
import { loadSuluk } from "@/lib/sulukData";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.suluk.title };

export default async function SulukPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const store = getStore();
  const session = await store.getSession();
  const header = (
    <>
      <p className="eyebrow">{t.suluk.eyebrow}</p>
      <h1 className="page-title">{t.suluk.title}</h1>
      <p className="page-intro">{t.suluk.intro}</p>
    </>
  );
  if (!session) {
    return (
      <div className="max-w-5xl">
        {header}
        <p className="mt-6">
          <Link href="/connexion" className="button">
            {t.suluk.signIn}
          </Link>
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const { settings, groups } = await loadSuluk(session.userId);
  const today = todayKey(settings.timezone);
  const selected = params.jour && isWirdDay(params.jour) && params.jour <= today ? params.jour : null;
  const from = selected && selected < addDays(today, -1) ? selected : addDays(today, -1);
  const [entries, abdal, journal, focus] = await Promise.all([
    store.listWird(session.userId, from, addDays(today, 1)),
    store.listExercises(session.userId),
    store.listJournal(session.userId, selected ?? today, selected ?? today),
    store.getStationFocus(session.userId),
  ]);
  const focused = focus ? stationById(focus.station) : undefined;
  const progress = focus ? focusDay(focus, today) : null;
  const done = entries.map((entry) => `${entry.day}|${entry.litany}`);
  const shown = selected ?? today;
  const nextDay = addDays(shown, 1);

  return (
    <div className="suluk-wide">
      {/* La première chose qu'on voit : ce qu'il y a à faire maintenant, ou ensuite, et la station du mois. */}
      {!selected && (
        <SulukNext
          settings={settings}
          groups={groups}
          abdal={abdal}
          done={done}
          station={focused && progress && !progress.finished ? focused.arabic : null}
        />
      )}

      <div className="suluk-now">
        {!selected && <SulukClock timezone={settings.timezone} />}
        {/* Revoir les jours passés : un jour en arrière ou en avant (jamais après aujourd'hui), ou le calendrier du mois.
            La date ne s'écrit que pour un jour passé : aujourd'hui, l'en-tête la montre déjà. */}
        <span className="suluk-day-nav">
          <Link
            href={`/suluk?jour=${addDays(shown, -1)}`}
            className="icon-quiet is-down"
            aria-label={t.suluk.previousDay}
          >
            <Icon name="arrowL" />
          </Link>
          {selected && <span className="first-letter:uppercase">{formatDay(shown)}</span>}
          {selected && (
            <Link
              href={nextDay === today ? "/suluk" : `/suluk?jour=${nextDay}`}
              className="icon-quiet is-down"
              aria-label={t.suluk.nextDay}
            >
              <Icon name="arrowR" />
            </Link>
          )}
          <Link
            href={`/suluk/calendrier?mois=${shown.slice(0, 7)}`}
            className="icon-quiet is-down"
            aria-label={t.suluk.calendar}
          >
            <Icon name="calendar" />
          </Link>
        </span>
      </div>

      <SulukToday
        key={selected ?? "aujourdhui"}
        abdal={abdal}
        focusQuestion={focused && !progress?.finished ? t.echiquier.focusQuestion(focused.name) : null}
        journal={Object.fromEntries(journal.map((entry) => [entry.key, entry.text]))}
        settings={settings}
        groups={groups}
        done={done}
        selectedDay={selected}
        serverToday={today}
      />

      <EchiquierSection userId={session.userId} today={today} groups={groups} />
    </div>
  );
}
