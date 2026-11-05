import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { t } from "@/messages/fr";
import type { LitanyGroup, Prayer, PrayerMethod, SulukSettings, WirdEntry } from "./data/types";

// Les jours sont des chaînes AAAA-MM-JJ à l'heure locale : elles se comparent et se trient telles quelles.
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Sans fuseau, l'heure de l'appareil.
export function todayKey(timezone?: string) {
  return timezone ? dayIn(new Date(), timezone) : dayKey(new Date());
}

function partsIn(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function dayIn(date: Date, timezone: string) {
  return partsIn(date, timezone).day;
}

export function minuteIn(date: Date, timezone: string) {
  return partsIn(date, timezone).minute;
}

export function isTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

export function isWirdDay(day: string) {
  return DAY.test(day) && dayKey(parseDay(day)) === day;
}

export function addDays(day: string, count: number) {
  const date = parseDay(day);
  date.setDate(date.getDate() + count);
  return dayKey(date);
}

export function weekdayOf(day: string) {
  return parseDay(day).getDay();
}

export function groupsOf(day: string, groups: LitanyGroup[]) {
  const weekday = weekdayOf(day);
  return groups.filter((group) => group.days.includes(weekday));
}

// Sans nom choisi, une séance seule porte le nom de sa litanie, sinon celui de son moment : « Après Fajr (4) ».
export function groupLabel(group: LitanyGroup) {
  if (group.name) return group.name;
  if (group.items.length === 1) return group.items[0].name;
  const moment =
    group.anchor === "fixed"
      ? `À ${group.time}`
      : group.anchor === "after"
        ? t.suluk.chained
        : t.suluk.after(t.suluk.prayers[group.anchor]);
  return `${moment} (${group.items.length})`;
}

export function doneByDay(entries: WirdEntry[]) {
  const days = new Map<string, Set<string>>();
  for (const { day, litany } of entries) {
    if (!days.has(day)) days.set(day, new Set());
    days.get(day)!.add(litany);
  }
  return days;
}

export type Done = Map<string, Set<string>>;

// Une journée sans litanie prévue ne compte ni pour ni contre.
export function isComplete(day: string, done: Done, groups: LitanyGroup[]) {
  const due = groupsOf(day, groups);
  const practices = done.get(day);
  return due.length > 0 && Boolean(practices) && due.every((group) => practices!.has(group.id));
}

// La journée en cours ne casse pas la série tant qu'elle n'est pas finie.
export function currentStreak(today: string, done: Done, groups: LitanyGroup[]) {
  let cursor = isComplete(today, done, groups) ? today : addDays(today, -1);
  let count = 0;
  for (let guard = 0; guard < 4000 && isComplete(cursor, done, groups); guard++) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function bestStreak(done: Done, groups: LitanyGroup[]) {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...done.keys()].sort()) {
    if (!isComplete(day, done, groups)) {
      run = 0;
      previous = null;
      continue;
    }
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

// Semaines du mois, du lundi au dimanche ; null pour les cases hors du mois.
export function monthGrid(month: string) {
  const first = parseDay(`${month}-01`);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let date = 1; date <= length; date++) cells.push(`${month}-${pad(date)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, count: number) {
  const date = parseDay(`${month}-01`);
  date.setMonth(date.getMonth() + count);
  return dayKey(date).slice(0, 7);
}

export function formatDay(day: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    parseDay(day),
  );
}

export function formatHijri(day: string) {
  return new Intl.DateTimeFormat("fr-FR-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDay(day));
}

export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(parseDay(`${month}-01`));
}

// Heures de prière calculées sur l'appareil : aucun service en ligne n'est nécessaire.
function parameters(method: PrayerMethod) {
  const params =
    method === "egypt"
      ? CalculationMethod.Egyptian()
      : method === "ummalqura"
        ? CalculationMethod.UmmAlQura()
        : method === "moonsighting"
          ? CalculationMethod.MoonsightingCommittee()
          : method === "mwl"
            ? CalculationMethod.MuslimWorldLeague()
            : CalculationMethod.Other();
  if (method === "france") {
    params.fajrAngle = 12;
    params.ishaAngle = 12;
  }
  if (method === "morocco") {
    params.fajrAngle = 19;
    params.ishaAngle = 17;
  }
  // École malikite : l'Asr commence quand l'ombre égale l'objet.
  params.madhab = Madhab.Shafi;
  return params;
}

export type PrayerClock = Record<Prayer, number>;

// Minutes depuis minuit, à l'heure locale du lieu.
export function prayerTimes(day: string, settings: SulukSettings): PrayerClock {
  const times = new PrayerTimes(
    new Coordinates(settings.latitude, settings.longitude),
    parseDay(day),
    parameters(settings.method),
  );
  const minutes = (date: Date) => minuteIn(date, settings.timezone);
  return {
    fajr: minutes(times.fajr),
    sunrise: minutes(times.sunrise),
    dhuhr: minutes(times.dhuhr),
    asr: minutes(times.asr),
    maghrib: minutes(times.maghrib),
    isha: minutes(times.isha),
  };
}

// Une litanie d'une séance se coche aussi à part : sa clé est « séance#nom ».
export function itemKey(groupId: string, item: { name: string }) {
  return `${groupId}#${item.name}`;
}

// Où en est une séance ce jour-là : faite si elle a été cochée en entier ou si toutes ses litanies l'ont été ;
// « en partie » si seulement certaines l'ont été. minutes : le temps réellement accompli.
export function groupProgress(day: string, group: Pick<LitanyGroup, "id" | "items">, done: Set<string>) {
  const whole = done.has(`${day}|${group.id}`);
  const items = group.items.map((item) => whole || done.has(`${day}|${itemKey(group.id, item)}`));
  const complete = whole || (items.length > 0 && items.every(Boolean));
  const minutes = group.items.reduce((sum, item, index) => sum + (complete || items[index] ? item.duration : 0), 0);
  return { done: complete, partial: !complete && items.some(Boolean), items, minutes };
}

export function groupDuration(group: Pick<LitanyGroup, "items">) {
  return group.items.reduce((sum, item) => sum + item.duration, 0);
}

// Heure de début d'une séance. Une séance enchaînée commence à la fin de celle qu'elle suit
// (plus sa pause) : il faut alors toutes les séances pour remonter la chaîne. Une chaîne rompue
// ou qui boucle repart du Fajr.
export function groupMinute(
  group: Pick<LitanyGroup, "anchor" | "offset" | "time" | "follows"> & { id?: string },
  clock: PrayerClock,
  all: LitanyGroup[] = [],
  seen: Set<string> = new Set(),
): number {
  if (group.anchor === "after") {
    const previous = all.find((item) => item.id === group.follows);
    if (group.id) seen.add(group.id);
    if (!previous || seen.has(previous.id)) return clock.fajr;
    const start = groupMinute(previous, clock, all, seen) + groupDuration(previous) + group.offset;
    return ((start % 1440) + 1440) % 1440;
  }
  if (group.anchor === "fixed") {
    const [hours, minutes] = (group.time ?? "00:00").split(":").map(Number);
    return hours * 60 + minutes;
  }
  return (((clock[group.anchor] + group.offset) % 1440) + 1440) % 1440;
}

export function formatMinute(minute: number) {
  return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}

export const CITIES: { name: string; latitude: number; longitude: number; timezone: string }[] = [
  { name: "Dakar", latitude: 14.6928, longitude: -17.4467, timezone: "Africa/Dakar" },
  { name: "Tivaouane", latitude: 14.95, longitude: -16.8167, timezone: "Africa/Dakar" },
  { name: "Kaolack (Médina Baye)", latitude: 14.1652, longitude: -16.0726, timezone: "Africa/Dakar" },
  { name: "Thiès", latitude: 14.791, longitude: -16.9256, timezone: "Africa/Dakar" },
  { name: "Touba", latitude: 14.85, longitude: -15.8833, timezone: "Africa/Dakar" },
  { name: "Saint-Louis", latitude: 16.0179, longitude: -16.4896, timezone: "Africa/Dakar" },
  { name: "Ourossogui", latitude: 15.605, longitude: -13.322, timezone: "Africa/Dakar" },
  { name: "Banjul", latitude: 13.4549, longitude: -16.579, timezone: "Africa/Banjul" },
  { name: "Nouakchott", latitude: 18.0735, longitude: -15.9582, timezone: "Africa/Nouakchott" },
  { name: "Bamako", latitude: 12.6392, longitude: -8.0029, timezone: "Africa/Bamako" },
  { name: "Conakry", latitude: 9.6412, longitude: -13.5784, timezone: "Africa/Conakry" },
  { name: "Abidjan", latitude: 5.36, longitude: -4.0083, timezone: "Africa/Abidjan" },
  { name: "Fès", latitude: 34.0331, longitude: -5.0003, timezone: "Africa/Casablanca" },
  { name: "Aïn Madhi", latitude: 33.7967, longitude: 2.2939, timezone: "Africa/Algiers" },
  { name: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { name: "Lyon", latitude: 45.764, longitude: 4.8357, timezone: "Europe/Paris" },
  { name: "Marseille", latitude: 43.2965, longitude: 5.3698, timezone: "Europe/Paris" },
  { name: "Bruxelles", latitude: 50.8503, longitude: 4.3517, timezone: "Europe/Brussels" },
  { name: "Milan", latitude: 45.4642, longitude: 9.19, timezone: "Europe/Rome" },
  { name: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
];

export const DEFAULT_SETTINGS: SulukSettings = {
  city: "Dakar",
  latitude: 14.6928,
  longitude: -17.4467,
  method: "mwl",
  timezone: "Africa/Dakar",
};
