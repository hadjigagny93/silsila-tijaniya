"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setWird } from "@/app/actions";
import { EXERCISE_COLORS, exerciseKey, exercisesOf, exerciseSpan, isOnDial } from "@/lib/exercises";
import {
  EXERCISE_FAMILIES,
  PRAYERS,
  type Exercise,
  type ExerciseFamily,
  type ExerciseKind,
  type LitanyGroup,
  type SulukSettings,
} from "@/lib/data/types";
import {
  dayIn,
  formatMinute,
  groupDuration,
  groupLabel,
  groupMinute,
  groupProgress,
  groupsOf,
  itemKey,
  minuteIn,
  prayerTimes,
} from "@/lib/suluk";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";
import { ExerciseDaily } from "./ExerciseDaily";
import { SulukDial, type DialLitany, type DialRing } from "./SulukDial";
import { useHiddenRings } from "./useHiddenRings";
import { useNow } from "./useNow";

// Fenêtre, en minutes, de la liste « à faire maintenant ».
const SOON = 30;
const FAMILIES = ["hilya", "heart", "conduct"] as const satisfies readonly ExerciseFamily[];

// Un seul cadran, une seule horloge : les séances de litanies sur l'anneau extérieur,
// puis la Ḥilyat al-Abdāl, les exercices du cœur et ceux de la conduite, vers le centre.
export function SulukToday({
  settings,
  groups,
  abdal,
  journal,
  focusQuestion,
  done,
  selectedDay,
  serverToday,
}: {
  settings: SulukSettings;
  groups: LitanyGroup[];
  abdal: Exercise[];
  // Ce qui a été écrit pour le jour affiché : service rendu, bilan du soir.
  journal: Record<string, string>;
  focusQuestion: string | null;
  // Clés « jour|litanie » déjà cochées.
  done: string[];
  selectedDay: string | null;
  serverToday: string;
}) {
  const now = useNow();
  const today = now ? dayIn(now, settings.timezone) : serverToday;
  const day = selectedDay ?? today;
  const isToday = day === today;
  const nowMinute = now && isToday ? minuteIn(now, settings.timezone) : null;

  const [, startTransition] = useTransition();
  const [checked, toggle] = useOptimistic(new Set(done), (current, key: string) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const clock = prayerTimes(day, settings);
  const mine = exercisesOf(day, abdal);
  const withDone = (entries: Omit<DialLitany, "done">[]) =>
    entries.map((entry) => ({ ...entry, done: checked.has(`${day}|${entry.id}`) })).sort((a, b) => a.minute - b.minute);

  const rings: DialRing[] = [
    {
      key: "litanies",
      title: t.abdal.litaniesArabic,
      label: t.abdal.tabLitanies,
      // Une séance est faite quand toutes ses litanies le sont ; chacune se coche aussi à part.
      litanies: groupsOf(day, groups)
        .map((group) => {
          const progress = groupProgress(day, group, checked);
          // Le nombre de fois suit le nom : « صلاة الفاتح ×500 ».
          const labels = group.items.map(
            (item) => `${item.arabic ?? item.name}${item.count ? ` ${t.suluk.times(item.count)}` : ""}`,
          );
          return {
            id: group.id,
            name: groupLabel(group),
            arabic: labels,
            minute: groupMinute(group, clock, groups),
            duration: groupDuration(group),
            color: group.color,
            done: progress.done,
            partial: progress.partial,
            items: group.items.map((item, index) => ({
              key: itemKey(group.id, item),
              label: labels[index],
              minutes: item.duration,
              done: progress.items[index],
            })),
          };
        })
        .sort((a, b) => a.minute - b.minute),
    },
    ...FAMILIES.map((family) => ({
      key: family,
      title: t.abdal.families[family].arabic,
      label: t.abdal.families[family].title,
      litanies: withDone(
        mine
          .filter(
            (practice) =>
              (EXERCISE_FAMILIES[family] as readonly ExerciseKind[]).includes(practice.kind) && isOnDial(practice.kind),
          )
          .map((practice) => ({
            id: exerciseKey(practice.id),
            name: t.abdal.pillars[practice.kind].name,
            arabic: [t.abdal.pillars[practice.kind].arabic],
            ...exerciseSpan(practice, clock),
            color: EXERCISE_COLORS[practice.kind],
          })),
      ),
    })),
  ];
  // Seuls les cercles affichés comptent pour le cadran et ses avis.
  const { hidden, toggle: toggleRing } = useHiddenRings();
  const shown = rings.filter((ring) => !hidden.has(ring.key));
  const due = shown.flatMap((ring) => ring.litanies).sort((a, b) => a.minute - b.minute);
  // Les exercices sans plage horaire comptent pour la journée, même s'ils ne sont pas sur le cadran.
  const offDial = mine.filter((practice) => !isOnDial(practice.kind));
  const offDialLeft = offDial.filter((practice) => !checked.has(`${day}|${exerciseKey(practice.id)}`)).length;
  const remaining = due.filter((litany) => !litany.done).length + offDialLeft;

  // Après l'Icha, la prochaine prière est le Fajr du lendemain.
  const nextPrayer =
    nowMinute === null
      ? null
      : (PRAYERS.map((prayer) => ({ prayer, minute: clock[prayer] })).find((item) => item.minute > nowMinute) ?? {
          prayer: "fajr" as const,
          minute: clock.fajr + 1440,
        });
  const nextLitany = nowMinute === null ? null : due.find((litany) => !litany.done && litany.minute > nowMinute);
  const current =
    nowMinute === null
      ? null
      : due.find((litany) => !litany.done && litany.minute <= nowMinute && nowMinute < litany.minute + litany.duration);
  const soonest =
    nextPrayer && nextLitany && nextLitany.minute < nextPrayer.minute
      ? { name: nextLitany.name, minute: nextLitany.minute }
      : nextPrayer && { name: t.suluk.prayers[nextPrayer.prayer], minute: nextPrayer.minute };
  const status =
    due.length + offDial.length === 0
      ? t.suluk.nothingToday
      : remaining === 0
        ? t.suluk.complete
        : t.suluk.left(remaining);

  // Ce qu'il y a à faire dans la demi-heure : ce qui est en cours, ce qui commence bientôt, et la prière qui vient.
  const soon =
    nowMinute === null
      ? []
      : [
          ...due
            .filter(
              (litany) =>
                !litany.done && litany.minute <= nowMinute + SOON && nowMinute < litany.minute + litany.duration,
            )
            .map((litany) => ({
              id: litany.id,
              name: litany.name,
              arabic: litany.arabic.join(" · "),
              minute: litany.minute,
              end: litany.minute + litany.duration,
              litany,
            })),
          ...(nextPrayer && nextPrayer.minute - nowMinute <= SOON
            ? [
                {
                  id: `priere-${nextPrayer.prayer}`,
                  name: t.suluk.prayerItem(t.suluk.prayers[nextPrayer.prayer]),
                  arabic: t.suluk.prayersArabic[nextPrayer.prayer],
                  minute: nextPrayer.minute,
                  end: nextPrayer.minute,
                  litany: null,
                },
              ]
            : []),
        ].sort((a, b) => a.minute - b.minute);
  const soonIds = new Set(soon.map((item) => item.id));
  const soonMuhasaba = mine.filter((practice) => practice.kind === "muhasaba" && soonIds.has(exerciseKey(practice.id)));

  const toggleEntry = (id: string, wasDone: boolean) =>
    startTransition(async () => {
      toggle(`${day}|${id}`);
      await setWird(day, id, !wasDone);
    });
  // Plusieurs coches d'un coup (une séance et ses litanies), chacune seulement si elle change.
  const setMany = (changes: [string, boolean][]) =>
    startTransition(async () => {
      const real = changes.filter(([key, value]) => checked.has(`${day}|${key}`) !== value);
      for (const [key] of real) toggle(`${day}|${key}`);
      for (const [key, value] of real) await setWird(day, key, value);
    });

  // Une séance de plusieurs litanies s'ouvre sur sa liste ; une seule litanie ou un exercice se coche directement.
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rings[0].litanies.find((litany) => litany.id === openId) ?? null;
  const onToggle = (litany: DialLitany) => {
    if (litany.items && litany.items.length > 1) setOpenId(litany.id);
    else if (litany.items)
      setMany([[litany.id, !litany.done], ...litany.items.map(({ key }): [string, boolean] => [key, false])]);
    else toggleEntry(litany.id, litany.done);
  };
  // Toute la séance : on coche la séance elle-même ; tout décocher retire aussi les coches des litanies.
  const setWhole = (litany: DialLitany, value: boolean) =>
    setMany([
      [litany.id, value],
      ...(value ? [] : (litany.items ?? []).map(({ key }): [string, boolean] => [key, false])),
    ]);
  // Une litanie : si la séance était cochée en entier, on la remplace par ses litanies, sauf celle-ci.
  const setItem = (litany: DialLitany, key: string, value: boolean) => {
    const whole = checked.has(`${day}|${litany.id}`);
    if (!whole) return setMany([[key, value]]);
    setMany([
      [litany.id, false],
      ...(litany.items ?? []).map((item): [string, boolean] => [item.key, item.key === key ? value : true]),
    ]);
  };

  const center =
    nowMinute !== null && current ? (
      <>
        <span className="dial-next-label">{t.suluk.now}</span>
        <span className="dial-next">{current.name}</span>
        <span className="dial-in">{t.suluk.leftTime(current.minute + current.duration - nowMinute)}</span>
      </>
    ) : nowMinute !== null && soonest ? (
      <>
        <span className="dial-next-label">{t.suluk.next}</span>
        <span className="dial-next">{soonest.name}</span>
        <span className="dial-in">{t.suluk.inTime(soonest.minute - nowMinute)}</span>
      </>
    ) : (
      <span className="dial-in">{status}</span>
    );

  return (
    <section className="suluk-today suluk-board">
      <SulukDial
        clock={clock}
        rings={shown}
        now={nowMinute}
        center={center}
        onToggle={onToggle}
        label={t.suluk.dialLabel}
      />

      <div className="suluk-side">
        <ul className="dial-legend">
          {rings.map((ring) => (
            <li key={ring.key} className={hidden.has(ring.key) ? "is-hidden" : undefined}>
              <button
                type="button"
                className="dial-legend-toggle"
                role="switch"
                aria-checked={!hidden.has(ring.key)}
                aria-label={t.suluk.showRing(ring.label)}
                onClick={() => toggleRing(ring.key)}
              >
                <span className="dial-legend-switch" aria-hidden />
              </button>
              {/* Le titre arabe mène aux réglages du cercle : les litanies, ou la famille d'exercices. */}
              <Link
                href={ring.key === "litanies" ? "/suluk/litanies" : `/suluk/abdal?famille=${ring.key}`}
                lang="ar"
                className="dial-legend-title"
                aria-label={ring.key === "litanies" ? t.suluk.manage : `${t.abdal.manage} · ${ring.label}`}
              >
                {ring.title}
              </Link>
            </li>
          ))}
        </ul>

        {/* Le bilan du soir s'ouvre ici quand sa plage approche. */}
        <ExerciseDaily
          day={day}
          exercises={soonMuhasaba}
          checked={checked}
          journal={journal}
          onToggle={toggleEntry}
          focusQuestion={focusQuestion}
        />

        {/* Les exercices sans horaire, repliés : on les ouvre pour les cocher dans la journée. */}
        {offDial.length > 0 && (
          <details className="suluk-untimed">
            <summary>
              <Icon name="chevron" />
              {t.suluk.untimed}
              <span className="suluk-untimed-count">
                {offDialLeft === 0 ? t.suluk.untimedDone : t.suluk.untimedLeft(offDialLeft, offDial.length)}
              </span>
            </summary>
            <ExerciseDaily
              day={day}
              exercises={offDial}
              checked={checked}
              journal={journal}
              onToggle={toggleEntry}
              focusQuestion={focusQuestion}
            />
          </details>
        )}

        {!isToday && (
          <Link href="/suluk" className="button-quiet mt-2">
            {t.suluk.backToday}
          </Link>
        )}
      </div>
      {open && open.items && (
        <div className="litany-sheet" role="dialog" aria-label={open.name} onClick={() => setOpenId(null)}>
          <div className="litany-sheet-panel" onClick={(event) => event.stopPropagation()}>
            <div className="litany-sheet-head">
              <span className="notice-swatch" style={{ background: open.color }} />
              <span className="min-w-0 flex-1">
                <span className="wird-name">{open.name}</span>
                <span className="wird-when">
                  {formatMinute(open.minute)} – {formatMinute((open.minute + open.duration) % 1440)}
                </span>
              </span>
              <button
                type="button"
                className="icon-quiet is-danger"
                onClick={() => setOpenId(null)}
                aria-label={t.suluk.close}
              >
                <Icon name="close" />
              </button>
            </div>
            <ul className="litany-sheet-list">
              {open.items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="litany-sheet-item"
                    aria-pressed={item.done}
                    onClick={() => setItem(open, item.key, !item.done)}
                  >
                    <span className="exercise-check" aria-hidden data-done={item.done || undefined}>
                      {item.done && <Icon name="check" />}
                    </span>
                    <span lang="ar" className="litany-arabic">
                      {item.label}
                    </span>
                    <span className="wird-when ms-auto">{item.minutes} min</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="button w-full" onClick={() => setWhole(open, !open.done)}>
              {open.done ? t.suluk.uncheckAll : t.suluk.checkAll}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
