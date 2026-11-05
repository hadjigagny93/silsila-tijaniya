import type { Metadata } from "next";
import Link from "next/link";
import { EchiquierSection } from "@/components/EchiquierSection";
import { Flame } from "@/components/Flame";
import { Hourglass } from "@/components/Hourglass";
import { Icon } from "@/components/Icon";
import { SulukClock } from "@/components/SulukClock";
import { SulukToday } from "@/components/SulukToday";
import { getStore } from "@/lib/data";
import { dayCompletion } from "@/lib/progress";
import { addDays, formatDay, formatHijri, isWirdDay, todayKey } from "@/lib/suluk";
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
  // Flamme du jour : la part du temps de Suluk accomplie aujourd'hui.
  const todayRate = dayCompletion(selected ?? today, groups, abdal, new Set(done));
  const shown = selected ?? today;
  const nextDay = addDays(shown, 1);

  return (
    <div className="suluk-wide">
      {header}

      <div className="suluk-now">
        {!selected && <SulukClock timezone={settings.timezone} />}
        <Flame
          className="flame-suluk"
          intensity={todayRate.ratio}
          label={t.echiquier.flameLabel(todayRate.done, todayRate.total, Boolean(selected))}
        />
        <Hourglass
          className="hourglass-suluk"
          ratio={todayRate.ratio}
          label={t.suluk.hourglass(todayRate.done, todayRate.total)}
        />
        <p className="suluk-date">
          {/* Revoir les jours passés : un jour en arrière ou en avant (jamais après aujourd'hui), ou le calendrier du mois. */}
          <span className="suluk-day-nav">
            <Link
              href={`/suluk?jour=${addDays(shown, -1)}`}
              className="icon-quiet is-down"
              aria-label={t.suluk.previousDay}
            >
              <Icon name="arrowL" />
            </Link>
            <span className="first-letter:uppercase">{formatDay(shown)}</span>
            {selected ? (
              <Link
                href={nextDay === today ? "/suluk" : `/suluk?jour=${nextDay}`}
                className="icon-quiet is-down"
                aria-label={t.suluk.nextDay}
              >
                <Icon name="arrowR" />
              </Link>
            ) : (
              <span className="icon-quiet" aria-hidden />
            )}
            <Link
              href={`/suluk/calendrier?mois=${shown.slice(0, 7)}`}
              className="icon-quiet is-down"
              aria-label={t.suluk.calendar}
            >
              <Icon name="calendar" />
            </Link>
          </span>
          {formatHijri(selected ?? today)} · {settings.city} ·{" "}
          <Link href="/suluk/litanies#reglages" className="underline-offset-4 hover:underline">
            {t.suluk.settings}
          </Link>
        </p>
      </div>

      {focused && progress && (
        <Link href="#echiquier" className="focus-banner">
          <span className="label">{t.echiquier.focus}</span>
          <span className="focus-banner-name">
            <span lang="ar">{focused.arabic}</span> · {focused.name}
          </span>
          <span className="text-muted">
            {progress.finished ? t.echiquier.focusDone : t.echiquier.focusDay(progress.day, focus!.days)}
          </span>
        </Link>
      )}

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
