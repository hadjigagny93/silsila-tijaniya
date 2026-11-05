import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteExercise, saveExercise } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { getStore } from "@/lib/data";
import { EXERCISE_FAMILIES, type Exercise, type ExerciseFamily, type ExerciseKind } from "@/lib/data/types";
import { EXERCISE_COLORS, isSlotKind } from "@/lib/exercises";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.abdal.pageTitle };

const WEEK = [1, 2, 3, 4, 5, 6, 0];
// Plages proposées à l'ajout, selon l'exercice.
const DEFAULT_SLOTS: Partial<Record<ExerciseKind, [string, string]>> = {
  vigil: ["03:00", "05:00"],
  muhasaba: ["21:00", "21:15"],
  muraqaba: ["06:30", "06:50"],
  tafakkur: ["21:30", "21:50"],
  ilm: ["20:00", "20:30"],
};

function daysText(days: number[]) {
  if (days.length === 7) return t.suluk.everyDay;
  return WEEK.filter((day) => days.includes(day))
    .map((day) => t.suluk.weekdayNames[day])
    .join(", ");
}

function DayPicker({ selected }: { selected: number[] }) {
  return (
    <div className="day-picker">
      {WEEK.map((day) => (
        <label key={day}>
          <input type="checkbox" name="days" value={day} defaultChecked={selected.includes(day)} />
          <span>{t.suluk.weekdayNames[day]}</span>
        </label>
      ))}
    </div>
  );
}

function NoteField({ kind, value }: { kind: ExerciseKind; value?: string | null }) {
  const label = t.abdal.noteLabel[kind];
  if (!label) return null;
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input name="note" maxLength={200} defaultValue={value ?? ""} placeholder={t.abdal.notePlaceholder[kind]} className="field" />
    </label>
  );
}

// Exercice sans plage : un seul engagement, ses jours (et sa qualité pour l'adab).
function SingleForm({ kind, entry }: { kind: ExerciseKind; entry?: Exercise }) {
  return (
    <form action={saveExercise} className="litany-form mt-4">
      <input type="hidden" name="kind" value={kind} />
      <NoteField kind={kind} value={entry?.note} />
      <fieldset>
        <legend className="field-label">{kind === "hunger" ? `${t.abdal.fast} · ${t.abdal.fastSpan}` : t.suluk.daysLabel}</legend>
        <DayPicker selected={entry?.days ?? []} />
      </fieldset>
      <div>
        <button className="button">{kind === "hunger" ? t.abdal.setFastDays : t.abdal.saveDays}</button>
      </div>
    </form>
  );
}

function SlotSection({ kind, entries }: { kind: ExerciseKind; entries: Exercise[] }) {
  const label = t.abdal.pillars[kind];
  const [start, end] = DEFAULT_SLOTS[kind] ?? ["14:00", "16:00"];
  return (
    <>
      <ul className="abdal-slots">
        {entries.length === 0 && <li className="text-muted">{t.abdal.none}</li>}
        {entries.map((entry) => (
          <li key={entry.id} className="abdal-slot">
            <span className="min-w-0 flex-1">
              <span className="wird-name">{t.abdal.span(entry.start!, entry.end!)}</span>
              <span className="wird-when">
                {daysText(entry.days)}
                {entry.note && ` · ${entry.note}`}
              </span>
            </span>
            <form action={deleteExercise}>
              <input type="hidden" name="id" value={entry.id} />
              <input type="hidden" name="kind" value={kind} />
              <ConfirmButton message={t.abdal.deleteConfirm(label.name)} className="button-danger">
                <Icon name="trash" />
                {t.abdal.delete}
              </ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveExercise} className="litany-form mt-4 border-t border-line pt-4">
        <input type="hidden" name="kind" value={kind} />
        <div className="litany-form-row">
          <label className="block flex-1">
            <span className="field-label">{t.abdal.from}</span>
            <input type="time" name="start" required defaultValue={start} className="field" />
          </label>
          <label className="block flex-1">
            <span className="field-label">{t.abdal.to}</span>
            <input type="time" name="end" required defaultValue={end} className="field" />
          </label>
        </div>
        <NoteField kind={kind} />
        <fieldset>
          <legend className="field-label">{t.suluk.daysLabel}</legend>
          <DayPicker selected={kind === "vigil" ? [] : WEEK} />
        </fieldset>
        <div>
          <button className="button-quiet">
            <Icon name="plus" />
            {t.abdal.addSlot}
          </button>
        </div>
      </form>
    </>
  );
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string; famille?: string }>;
}) {
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  const { ok, erreur, famille } = await searchParams;
  // Depuis un cadran, on ne voit que sa famille d'exercices.
  const all = Object.keys(EXERCISE_FAMILIES) as ExerciseFamily[];
  const only = all.find((family) => family === famille);
  const families = only ? [only] : all;
  const practices = await store.listExercises(session.userId);
  const of = (kind: ExerciseKind) => practices.filter((practice) => practice.kind === kind);

  return (
    <div className="max-w-4xl">
      <Link href="/suluk" className="back-link">
        <Icon name="arrowL" />
        {t.abdal.back}
      </Link>
      <h1 className="page-title mt-3">
        {only ? t.abdal.families[only].title : t.abdal.pageTitle}
        {only && (
          <span className="wird-arabic" lang="ar">
            {t.abdal.families[only].arabic}
          </span>
        )}
      </h1>
      <p className="page-intro">{t.abdal.intro}</p>
      {ok && <Notice tone="success">{t.suluk.saved}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}

      {families.map((family) => {
        const heading = t.abdal.families[family];
        return (
          <section key={family} id={family} className="exercise-family scroll-mt-6">
            {only ? (
              <p className="text-muted">{heading.intro}</p>
            ) : (
              <>
                <h2>
                  {heading.title}{" "}
                  <span className="wird-arabic" lang="ar">
                    {heading.arabic}
                  </span>
                </h2>
                <p className="mt-1 text-muted">{heading.intro}</p>
              </>
            )}

            {EXERCISE_FAMILIES[family].map((kind) => {
              const label = t.abdal.pillars[kind];
              return (
                <section
                  key={kind}
                  id={kind}
                  className="panel group-panel mt-4 scroll-mt-6"
                  style={{ "--group-color": EXERCISE_COLORS[kind] } as React.CSSProperties}
                >
                  <h3>
                    {label.name}{" "}
                    <span className="wird-arabic" lang="ar">
                      {label.arabic}
                    </span>
                  </h3>
                  <p className="mt-1 text-muted">{label.hint}</p>
                  {isSlotKind(kind) ? <SlotSection kind={kind} entries={of(kind)} /> : <SingleForm kind={kind} entry={of(kind)[0]} />}
                </section>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
