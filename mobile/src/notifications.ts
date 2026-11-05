import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { exerciseKey, exercisesOf, exerciseSpan, isOnDial } from "@/lib/exercises";
import {
  addDays,
  dayIn,
  groupDuration,
  groupLabel,
  groupMinute,
  groupProgress,
  groupsOf,
  minuteIn,
  prayerTimes,
  todayKey,
} from "@/lib/suluk";
import { t } from "@/messages/fr";
import { mobileStore } from "./data";

// Rappels de Suluk sur l'iPhone : 10 minutes avant chaque séance de litanies et chaque exercice qui a une heure.
// Ce sont des notifications locales, posées par l'app elle-même : elles sonnent même sans réseau ni Mac.
// iOS en garde au plus 64 d'avance : on prépare les trois prochains jours, et on refait la liste
// à chaque ouverture, après chaque coche et après chaque synchronisation.
const BEFORE = 10;
const DAYS = 3;
const LIMIT = 60;
const SOUND = "rappel.caf";

// Heure réelle d'un moment de la journée (jour + minute) dans le fuseau de la ville choisie dans Suluk.
function zoned(day: string, minute: number, timezone: string) {
  const [year, month, date] = day.split("-").map(Number);
  let time = Date.UTC(year, month - 1, date, Math.floor(minute / 60), minute % 60);
  for (let pass = 0; pass < 2; pass++) {
    const at = new Date(time);
    const shift =
      (dayIn(at, timezone) > day ? 1440 : dayIn(at, timezone) < day ? -1440 : 0) + minuteIn(at, timezone) - minute;
    time -= shift * 60000;
  }
  return new Date(time);
}

// Identifiant stable d'un rappel : le même moment garde le même numéro d'une programmation à l'autre.
function idOf(key: string) {
  let hash = 0;
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 2147483647 || 1;
}

async function upcoming() {
  const store = mobileStore;
  const settings = await store.getSulukSettings("local");
  if (!settings) return [];
  const [groups, exercises] = await Promise.all([store.listGroups("local"), store.listExercises("local")]);
  const today = todayKey(settings.timezone);
  const last = addDays(today, DAYS - 1);
  const done = new Set((await store.listWird("local", today, last)).map((entry) => `${entry.day}|${entry.litany}`));
  const now = Date.now();
  const reminders: { id: number; at: Date; title: string; body: string }[] = [];

  for (let offset = 0; offset < DAYS; offset++) {
    const day = addDays(today, offset);
    const clock = prayerTimes(day, settings);
    const items = [
      ...groupsOf(day, groups).map((group) => ({
        key: group.id,
        // Une séance dont toutes les litanies sont cochées n'a plus besoin de rappel.
        finished: groupProgress(day, group, done).done,
        minute: groupMinute(group, clock, groups),
        name: groupLabel(group),
        detail: group.items.map((item) => item.arabic ?? item.name).join(" · "),
        duration: groupDuration(group),
      })),
      ...exercisesOf(day, exercises)
        .filter((practice) => isOnDial(practice.kind))
        .map((practice) => ({
          key: exerciseKey(practice.id),
          ...exerciseSpan(practice, clock),
          name: t.abdal.pillars[practice.kind].name,
          detail: t.abdal.pillars[practice.kind].arabic,
        })),
    ];
    for (const item of items) {
      if (("finished" in item && item.finished) || done.has(`${day}|${item.key}`)) continue;
      const at = new Date(zoned(day, item.minute, settings.timezone).getTime() - BEFORE * 60000);
      if (at.getTime() <= now) continue;
      reminders.push({
        id: idOf(`${day}|${item.key}`),
        at,
        title: t.suluk.reminderTitle(item.name),
        body: t.suluk.reminderBody(item.detail, item.duration),
      });
    }
  }
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, LIMIT);
}

let timer: ReturnType<typeof setTimeout> | undefined;
let asked = false;

// Refait la liste des rappels (un peu après la dernière écriture, pour n'en faire qu'une fois).
export function scheduleReminders() {
  if (!Capacitor.isNativePlatform()) return;
  clearTimeout(timer);
  timer = setTimeout(() => void reschedule(), 1500);
}

async function reschedule() {
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display === "prompt" && !asked) {
      asked = true;
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== "granted") return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }
    const reminders = await upcoming();
    if (reminders.length === 0) return;
    await LocalNotifications.schedule({
      notifications: reminders.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        schedule: { at: reminder.at, allowWhileIdle: true },
        // Le son de la Salât al-Fâtih (29 s), livré avec l'app : mobile/ios/App/App/rappel.caf.
        sound: SOUND,
      })),
    });
  } catch (error) {
    console.error("Rappels de Suluk :", error);
  }
}
