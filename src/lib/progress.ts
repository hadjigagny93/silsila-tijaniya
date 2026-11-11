import type { Exercise, LitanyGroup, WirdEntry } from "./data/types";
import { exerciseKey, exercisesOf, isSlotKind } from "./exercises";
import { addDays, groupDuration, groupProgress, groupsOf } from "./suluk";

// Poids en minutes de ce qui n'a pas de durée propre : le jeûne couvre la journée,
// et l'aumône, le service ou l'adab ne se mesurent pas en heures.
const FAST_MINUTES = 60;
const UNTIMED_MINUTES = 10;

function minuteOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function exerciseMinutes(exercise: Exercise) {
  if (exercise.kind === "hunger") return FAST_MINUTES;
  if (!isSlotKind(exercise.kind) || !exercise.start || !exercise.end) return UNTIMED_MINUTES;
  return (((minuteOf(exercise.end) - minuteOf(exercise.start)) % 1440) + 1440) % 1440 || 1440;
}

// Part du temps assigné dans Suluk qui a été accomplie ce jour-là, de 0 à 1.
// Une séance compte pour le temps de ses litanies faites : une seule litanie sur trois, c'est son temps à elle.
export function dayCompletion(day: string, groups: LitanyGroup[], exercises: Exercise[], done: Set<string>) {
  const items = [
    ...groupsOf(day, groups).map((group) => ({
      minutes: groupDuration(group),
      accomplished: groupProgress(day, group, done).minutes,
    })),
    ...exercisesOf(day, exercises).map((exercise) => {
      const minutes = exerciseMinutes(exercise);
      return { minutes, accomplished: done.has(`${day}|${exerciseKey(exercise.id)}`) ? minutes : 0 };
    }),
  ];
  const total = items.reduce((sum, item) => sum + item.minutes, 0);
  if (total === 0) return { ratio: 0, done: 0, total: 0 };
  const accomplished = items.reduce((sum, item) => sum + item.accomplished, 0);
  return { ratio: accomplished / total, done: accomplished, total };
}

// Un taux par jour de la période, du premier jour jusqu'à aujourd'hui (ou la fin de la période).
export function periodCompletion(
  focus: { start: string; days: number },
  today: string,
  groups: LitanyGroup[],
  exercises: Exercise[],
  entries: WirdEntry[],
) {
  const done = new Set(entries.map((entry) => `${entry.day}|${entry.litany}`));
  const days: { day: string; ratio: number; done: number; total: number }[] = [];
  for (let index = 0; index < focus.days; index++) {
    const day = addDays(focus.start, index);
    if (day > today) break;
    days.push({ day, ...dayCompletion(day, groups, exercises, done) });
  }
  return days;
}
