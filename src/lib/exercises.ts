import { EXERCISE_FAMILIES, SLOT_KINDS, type Exercise, type ExerciseFamily, type ExerciseKind } from "./data/types";
import { weekdayOf, type PrayerClock } from "./suluk";

// Chaque exercice garde sa couleur sur le cadran et dans la liste du jour.
export const EXERCISE_COLORS: Record<ExerciseKind, string> = {
  hunger: "#c0573e",
  silence: "#3f6fb0",
  solitude: "#8a4fa3",
  vigil: "#2f7d68",
  muhasaba: "#a3496b",
  muraqaba: "#3f9aa8",
  tafakkur: "#6b7f2a",
  khidma: "#c08a2d",
  sadaqa: "#b0703a",
  adab: "#5b6fa8",
  ilm: "#7a5c3a",
};

export function familyOf(kind: ExerciseKind) {
  return (Object.keys(EXERCISE_FAMILIES) as ExerciseFamily[]).find((family) =>
    (EXERCISE_FAMILIES[family] as readonly ExerciseKind[]).includes(kind),
  )!;
}

// Page de réglage d'une famille : on y revient après chaque enregistrement.
export function familyPage(kind: ExerciseKind) {
  return `/suluk/abdal?famille=${familyOf(kind)}`;
}

// Un seul engagement par exercice sans plage : ses jours, et éventuellement sa note.
export const isSlotKind = (kind: ExerciseKind) => SLOT_KINDS.includes(kind);

// Le cadran montre le jeûne et les plages ; le reste se coche dans la liste du jour.
export const isOnDial = (kind: ExerciseKind) => kind === "hunger" || isSlotKind(kind);

// Identifiant d'un exercice dans le suivi, pour ne pas le confondre avec une séance de litanies.
export function exerciseKey(id: string) {
  return `abdal:${id}`;
}

export function exercisesOf(day: string, practices: Exercise[]) {
  const weekday = weekdayOf(day);
  return practices.filter((practice) => practice.days.includes(weekday));
}

function minuteOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Début et durée en minutes ; le jeûne va du Fajr au Maghrib, une plage peut passer minuit.
export function exerciseSpan(practice: Exercise, clock: PrayerClock) {
  if (practice.kind === "hunger") return { minute: clock.fajr, duration: clock.maghrib - clock.fajr };
  const start = minuteOf(practice.start ?? "00:00");
  const end = minuteOf(practice.end ?? "00:00");
  return { minute: start, duration: (((end - start) % 1440) + 1440) % 1440 || 1440 };
}

// Questions du bilan du soir (muḥāsaba), enregistrées ensemble dans le journal du jour.
export const MUHASABA_QUESTIONS = ["faults", "blessings", "tomorrow", "note"] as const;
// « focus » : la réponse à la question de la station du mois, quand il y en a une.
export type Muhasaba = Partial<Record<(typeof MUHASABA_QUESTIONS)[number] | "focus", string>>;
