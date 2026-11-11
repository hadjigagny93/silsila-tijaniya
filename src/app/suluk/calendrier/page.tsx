import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getStore } from "@/lib/data";
import { dayCompletion } from "@/lib/progress";
import { addDays, parseDay, todayKey, weekdayOf } from "@/lib/suluk";
import { loadSuluk } from "@/lib/sulukData";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.suluk.calendarTitle };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(parseDay(`${month}-01`));

function shiftMonth(month: string, step: number) {
  const date = parseDay(`${month}-01`);
  date.setMonth(date.getMonth() + step);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Un disque par jour, rempli à la mesure de la journée accomplie ; rien du tout, un simple point.
function DayFill({ ratio }: { ratio: number }) {
  if (ratio <= 0) return <span className="calendar-ember" aria-hidden />;
  return (
    <span
      className="calendar-fill"
      aria-hidden
      style={{ "--fill": `${Math.round(Math.min(1, ratio) * 100)}%` } as React.CSSProperties}
    />
  );
}

// Le mois en un coup d'œil : une flamme par jour, et chaque jour s'ouvre dans Suluk tel qu'il était.
export default async function SulukCalendarPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");

  const { settings, groups } = await loadSuluk(session.userId);
  const today = todayKey(settings.timezone);
  const requested = (await searchParams).mois;
  const month = requested && MONTH.test(requested) && requested <= today.slice(0, 7) ? requested : today.slice(0, 7);
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [entries, exercises] = await Promise.all([
    store.listWird(session.userId, first, last),
    store.listExercises(session.userId),
  ]);
  const done = new Set(entries.map((entry) => `${entry.day}|${entry.litany}`));

  const days: { day: string; ratio: number; future: boolean }[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) {
    days.push({ day, ratio: day > today ? 0 : dayCompletion(day, groups, exercises, done).ratio, future: day > today });
  }
  // Le lundi ouvre la semaine : on laisse des cases vides avant le premier jour du mois.
  const blanks = (weekdayOf(first) + 6) % 7;
  const past = days.filter((entry) => !entry.future);
  const average = past.length ? Math.round((past.reduce((sum, entry) => sum + entry.ratio, 0) / past.length) * 100) : 0;
  const next = shiftMonth(month, 1);

  return (
    <div className="max-w-3xl">
      <Link href="/suluk" className="back-link">
        <Icon name="arrowL" />
        {t.abdal.back}
      </Link>
      <h1 className="page-title mt-4">{t.suluk.calendarTitle}</h1>
      <p className="page-intro">{t.suluk.calendarIntro}</p>

      <div className="calendar-head">
        <Link
          href={`/suluk/calendrier?mois=${shiftMonth(month, -1)}`}
          className="icon-quiet is-down"
          aria-label={t.suluk.previousMonth}
        >
          <Icon name="arrowL" />
        </Link>
        <h2 className="calendar-month first-letter:uppercase">{monthLabel(month)}</h2>
        {next <= today.slice(0, 7) ? (
          <Link href={`/suluk/calendrier?mois=${next}`} className="icon-quiet is-down" aria-label={t.suluk.nextMonth}>
            <Icon name="arrowR" />
          </Link>
        ) : (
          <span className="icon-quiet" aria-hidden />
        )}
      </div>

      <div className="calendar-grid" role="grid">
        {t.suluk.weekdays.map((name) => (
          <span key={name} className="calendar-weekday" role="columnheader">
            {name}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, index) => (
          <span key={`vide-${index}`} />
        ))}
        {days.map(({ day, ratio, future }) => {
          const number = Number(day.slice(8));
          const percent = Math.round(ratio * 100);
          return future ? (
            <span key={day} className="calendar-day is-future">
              <span className="calendar-number">{number}</span>
            </span>
          ) : (
            <Link
              key={day}
              href={day === today ? "/suluk" : `/suluk?jour=${day}`}
              className={`calendar-day${day === today ? " is-today" : ""}`}
              aria-label={t.suluk.calendarDay(String(number), percent)}
              title={`${percent} %`}
            >
              <span className="calendar-number">{number}</span>
              <DayFill ratio={ratio} />
            </Link>
          );
        })}
      </div>

      {past.length > 0 && <p className="mt-4 text-sm text-muted">{t.suluk.calendarAverage(average, past.length)}</p>}
    </div>
  );
}
