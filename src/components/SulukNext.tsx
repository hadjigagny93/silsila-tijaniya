"use client";

import { EXERCISE_COLORS, exerciseKey, exercisesOf, exerciseSpan, isOnDial } from "@/lib/exercises";
import type { Exercise, LitanyGroup, SulukSettings } from "@/lib/data/types";
import {
  addDays,
  dayIn,
  formatMinute,
  groupDuration,
  groupLabel,
  groupMinute,
  groupProgress,
  groupsOf,
  minuteIn,
  prayerTimes,
} from "@/lib/suluk";
import { t } from "@/messages/fr";
import Link from "next/link";
import { useNow } from "./useNow";

type Item = { name: string; detail: string; start: number; end: number; color: string };

// Ce qu'il reste à faire un jour donné, séances de litanies et exercices à heure fixe, dans l'ordre.
function itemsOf(
  day: string,
  offset: number,
  settings: SulukSettings,
  groups: LitanyGroup[],
  abdal: Exercise[],
  done: Set<string>,
) {
  const clock = prayerTimes(day, settings);
  const shift = offset * 1440;
  const litanies: Item[] = groupsOf(day, groups)
    .filter((group) => !groupProgress(day, group, done).done)
    .map((group) => {
      const start = groupMinute(group, clock, groups) + shift;
      return {
        name: groupLabel(group),
        detail: group.items.map((item) => item.arabic ?? item.name).join(" · "),
        start,
        end: start + groupDuration(group),
        color: group.color,
      };
    });
  const exercises: Item[] = exercisesOf(day, abdal)
    .filter((practice) => isOnDial(practice.kind) && !done.has(`${day}|${exerciseKey(practice.id)}`))
    .map((practice) => {
      const span = exerciseSpan(practice, clock);
      return {
        name: t.abdal.pillars[practice.kind].name,
        detail: t.abdal.pillars[practice.kind].arabic,
        start: span.minute + shift,
        end: span.minute + span.duration + shift,
        color: EXERCISE_COLORS[practice.kind],
      };
    });
  return [...litanies, ...exercises].sort((a, b) => a.start - b.start);
}

const duration = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;

// La première chose qu'on voit dans Suluk : la séance ou l'exercice en cours, sinon le prochain, et dans combien de temps.
export function SulukNext({
  settings,
  groups,
  abdal,
  done,
  station = null,
}: {
  settings: SulukSettings;
  groups: LitanyGroup[];
  abdal: Exercise[];
  done: string[];
  // Nom arabe de la station du mois, en cours : il mène à l'Échiquier, en bas de la page.
  station?: string | null;
}) {
  const now = useNow();
  const stationLink = station && (
    <Link href="#echiquier" lang="ar" className="suluk-next-station" aria-label={t.echiquier.focus}>
      {station}
    </Link>
  );
  if (!now) return <div className="suluk-next is-empty" aria-hidden />;
  const today = dayIn(now, settings.timezone);
  const minute = minuteIn(now, settings.timezone);
  const checked = new Set(done);
  // Aujourd'hui d'abord ; s'il ne reste rien, la première chose de demain.
  const next =
    itemsOf(today, 0, settings, groups, abdal, checked).find((item) => item.end > minute) ??
    itemsOf(addDays(today, 1), 1, settings, groups, abdal, checked)[0];

  if (!next) {
    return (
      <section className="suluk-next">
        {stationLink}
        <p className="suluk-next-label">{t.suluk.nextUp}</p>
        <p className="suluk-next-name">{t.suluk.nothingNext}</p>
      </section>
    );
  }
  const running = next.start <= minute;
  return (
    <section className="suluk-next" style={{ "--group-color": next.color } as React.CSSProperties}>
      {stationLink}
      <p className="suluk-next-label">{running ? t.suluk.now : t.suluk.nextUp}</p>
      <p className="suluk-next-when">
        {running ? t.suluk.leftFor(duration(next.end - minute)) : t.suluk.inFor(duration(next.start - minute))}
      </p>
      <p className="suluk-next-name">{next.name}</p>
      <p className="suluk-next-detail" lang="ar">
        {next.detail}
      </p>
      <p className="suluk-next-hours">
        {formatMinute(next.start % 1440)} – {formatMinute(next.end % 1440)}
      </p>
    </section>
  );
}
