"use client";

import { useState, useTransition } from "react";
import { saveJournal } from "@/app/actions";
import type { Exercise } from "@/lib/data/types";
import { EXERCISE_COLORS, exerciseKey, MUHASABA_QUESTIONS, type Muhasaba } from "@/lib/exercises";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

function readMuhasaba(text: string | undefined): Muhasaba {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { note: text };
  }
}

// Exercices sans plage horaire : on les coche dans la journée, avec ce qu'on veut en garder.
export function ExerciseDaily({
  day,
  exercises,
  checked,
  journal,
  onToggle,
  focusQuestion,
}: {
  day: string;
  exercises: Exercise[];
  checked: Set<string>;
  journal: Record<string, string>;
  onToggle: (id: string, done: boolean) => void;
  // Question de la station du mois, ajoutée au bilan du soir.
  focusQuestion?: string | null;
}) {
  const [, startTransition] = useTransition();
  const [khidma, setKhidma] = useState(journal.khidma ?? "");
  const [bilan, setBilan] = useState<Muhasaba>(() => readMuhasaba(journal.muhasaba));
  const [saved, setSaved] = useState<string | null>(null);

  const save = (exercise: Exercise, value: string) =>
    startTransition(async () => {
      const kind = exercise.kind as "khidma" | "muhasaba";
      const id = exerciseKey(exercise.id);
      if (value.trim() && !checked.has(`${day}|${id}`)) onToggle(id, false);
      await saveJournal(day, kind, value, exercise.id);
      setSaved(kind);
    });

  if (exercises.length === 0) return null;

  return (
    <div className="exercise-daily">
      <h3 className="panel-title">{t.abdal.dailyTitle}</h3>
      <ul className="exercise-list">
        {exercises.map((exercise) => {
          const label = t.abdal.pillars[exercise.kind];
          const id = exerciseKey(exercise.id);
          const done = checked.has(`${day}|${id}`);
          return (
            <li key={exercise.id} className="exercise-row" style={{ "--group-color": EXERCISE_COLORS[exercise.kind] } as React.CSSProperties}>
              <div className="exercise-row-head">
                <span className="min-w-0 flex-1">
                  <span className="wird-name">
                    {label.name}
                    <span className="wird-arabic" lang="ar">
                      {label.arabic}
                    </span>
                  </span>
                  {exercise.start && exercise.end && <span className="wird-when">{t.abdal.span(exercise.start, exercise.end)}</span>}
                  {exercise.note && <span className="wird-when">{exercise.note}</span>}
                </span>
                <button
                  type="button"
                  className="exercise-check"
                  aria-pressed={done}
                  aria-label={t.abdal.markHeld(label.name)}
                  onClick={() => onToggle(id, done)}
                >
                  {done && <Icon name="check" />}
                </button>
              </div>

              {exercise.kind === "khidma" && (
                <form
                  className="exercise-journal"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(exercise, khidma);
                  }}
                >
                  <label className="block">
                    <span className="field-label">{t.abdal.khidmaAsk}</span>
                    <textarea
                      value={khidma}
                      onChange={(event) => {
                        setKhidma(event.target.value);
                        setSaved(null);
                      }}
                      rows={2}
                      maxLength={2000}
                      placeholder={t.abdal.khidmaPlaceholder}
                      className="field"
                    />
                  </label>
                  <button className="button-quiet">{saved === "khidma" ? t.abdal.journalSaved : t.abdal.saveJournal}</button>
                </form>
              )}

              {exercise.kind === "muhasaba" && (
                <details className="exercise-journal" open={Boolean(journal.muhasaba) || undefined}>
                  <summary className="button-quiet">{t.abdal.muhasabaOpen}</summary>
                  <form
                    className="mt-3 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const filled = Object.values(bilan).some((value) => value?.trim());
                      save(exercise, filled ? JSON.stringify(bilan) : "");
                    }}
                  >
                    {focusQuestion && (
                      <label className="block">
                        <span className="field-label focus-question">{focusQuestion}</span>
                        <textarea
                          value={bilan.focus ?? ""}
                          onChange={(event) => {
                            setBilan({ ...bilan, focus: event.target.value });
                            setSaved(null);
                          }}
                          rows={2}
                          maxLength={2000}
                          className="field"
                        />
                      </label>
                    )}
                    {MUHASABA_QUESTIONS.map((question) => (
                      <label key={question} className="block">
                        <span className="field-label">{t.abdal.muhasabaQuestions[question]}</span>
                        <textarea
                          value={bilan[question] ?? ""}
                          onChange={(event) => {
                            setBilan({ ...bilan, [question]: event.target.value });
                            setSaved(null);
                          }}
                          rows={2}
                          maxLength={2000}
                          className="field"
                        />
                      </label>
                    ))}
                    <div>
                      <button className="button">{saved === "muhasaba" ? t.abdal.journalSaved : t.abdal.saveJournal}</button>
                    </div>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
