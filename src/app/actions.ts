"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isChoosableMouqaddam } from "@/lib/chain";
import { listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import {
  EXERCISE_KINDS,
  GROUP_COLORS,
  PRAYER_METHODS,
  PRAYERS,
  SLOT_KINDS,
  type DisplayMode,
  type ExerciseKind,
  type LitanyGroup,
  type Prayer,
  type LitanyItem,
  type PrayerMethod,
  type PublicPerson,
} from "@/lib/data/types";
import { isValidYear, yearOf } from "@/lib/dates";
import { familyPage } from "@/lib/exercises";
import { FOCUS_LENGTHS, stationById } from "@/lib/stations";
import { slugify } from "@/lib/slug";
import { addDays, CITIES, isTimezone, isWirdDay, itemKey, todayKey } from "@/lib/suluk";
import { loadSuluk } from "@/lib/sulukData";

function text(form: FormData, name: string, max: number) {
  const value = String(form.get(name) ?? "").trim();
  return value.slice(0, max);
}

function optional(form: FormData, name: string, max: number) {
  return text(form, name, max) || null;
}

// L'image arrive recadrée par ImageField ; on n'accepte que ce format précis.
function imageData(form: FormData) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(form.get("image") ?? ""));
  return match && match[1].length <= 700000 ? match[1] : null;
}

async function requireSession() {
  const session = await getStore().getSession();
  if (!session) redirect("/connexion");
  return session;
}

async function requireAdmin() {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/");
}

// redirect() lève une exception : il doit rester hors du try.
async function attempt(run: () => Promise<void>, onSuccess: string, onError: string) {
  let target = onSuccess;
  try {
    await run();
    revalidatePath("/", "layout");
  } catch (error) {
    console.error(error);
    target = onError;
  }
  redirect(target);
}

export async function signIn(form: FormData) {
  const email = text(form, "email", 200).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/connexion?erreur=1");

  const origin = (await headers()).get("origin") ?? "";
  let target = "/mon-compte";
  try {
    const result = await getStore().signIn(email, `${origin}/auth/callback`);
    if (result === "email-sent") target = "/connexion?envoye=1";
  } catch (error) {
    console.error(error);
    target = "/connexion?erreur=1";
  }
  redirect(target);
}

export async function signOut() {
  await getStore().signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function saveProfile(form: FormData) {
  const session = await requireSession();
  const fullName = text(form, "fullName", 120);
  if (fullName.length < 2) redirect("/mon-compte?erreur=1");

  const displayMode: DisplayMode = form.get("displayMode") === "short" ? "short" : "full";
  await attempt(
    () =>
      getStore().saveProfile(session.userId, {
        fullName,
        displayMode,
        city: optional(form, "city", 120),
        mouqaddamId: optional(form, "mouqaddamId", 36),
      }),
    "/mon-compte?ok=fiche",
    "/mon-compte?erreur=1",
  );
}

export async function requestMouqaddam(form: FormData) {
  const session = await requireSession();
  const name = text(form, "name", 120);
  if (name.length < 2) redirect("/mon-compte?erreur=1");

  await attempt(
    () =>
      getStore().requestMouqaddam(
        session.userId,
        name,
        optional(form, "city", 120),
        optional(form, "note", 1000),
      ),
    "/mon-compte?ok=demande",
    "/mon-compte?erreur=1",
  );
}

export async function reportPerson(form: FormData) {
  const session = await requireSession();
  const personId = text(form, "personId", 36);
  const reason = text(form, "reason", 1000);
  const page = `/silsila/${encodeURIComponent(personId)}`;
  if (reason.length < 5) redirect(`${page}?erreur=1`);

  await attempt(
    () => getStore().reportPerson(session.userId, personId, reason),
    `${page}?ok=1`,
    `${page}?erreur=1`,
  );
}

function yearField(form: FormData, name: string) {
  const value = optional(form, name, 120);
  return value && isValidYear(value) ? value : null;
}

function nicknamesField(form: FormData) {
  const lines = text(form, "nicknames", 5000).split("\n").map((line) => line.trim().slice(0, 120));
  return [...new Set(lines.filter(Boolean))];
}

// Les maîtres argentés : des personnes qui peuvent transmettre (Prophète, cheikh, mouqaddam), sans la personne
// elle-même ni son maître doré.
async function alsoFromField(form: FormData, personId: string | null, goldenId: string | null) {
  const persons = await getStore().listPersons();
  const allowed = new Set(
    persons.filter((person) => person.kind === "prophet" || isChoosableMouqaddam(person)).map((person) => person.id),
  );
  const ids = form.getAll("alsoFrom").map((value) => String(value).slice(0, 36));
  return [...new Set(ids)].filter((id) => allowed.has(id) && id !== personId && id !== goldenId);
}

async function mouqaddamFields(form: FormData) {
  const slug = optional(form, "biographySlug", 120);
  return {
    name: text(form, "name", 120),
    mouqaddamId: optional(form, "mouqaddamId", 36),
    kind: form.get("kind") === "cheikh" ? ("cheikh" as const) : ("mouqaddam" as const),
    birthDate: yearField(form, "birthDate"),
    deathDate: yearField(form, "deathDate"),
    birthCity: optional(form, "birthCity", 120),
    birthCountry: optional(form, "birthCountry", 120),
    deathCity: optional(form, "deathCity", 120),
    deathCountry: optional(form, "deathCountry", 120),
    zawiya: optional(form, "zawiya", 200),
    nicknames: nicknamesField(form),
    qutb: form.get("qutb") === "on",
    prophetFamily: form.get("prophetFamily") === "on",
    biographySlug: slug && (await getStore().getBiography(slug)) ? slug : null,
  };
}

function datesInOrder(birthDate: string | null, deathDate: string | null) {
  const birth = yearOf(birthDate);
  const death = yearOf(deathDate);
  return !birth || !death || Number(birth) <= Number(death);
}

async function createBiographyFor(personId: string, person: { name: string }) {
  await getStore().saveBiography({
    slug: await freeSlug(person.name),
    name: person.name,
    summary: "",
    body: "",
    sources: "",
    draft: true,
    localOnly: true,
    cover: null,
    personId,
  });
}

export async function addMouqaddam(form: FormData) {
  await requireAdmin();
  const fields = await mouqaddamFields(form);
  if (fields.name.length < 2 || !datesInOrder(fields.birthDate, fields.deathDate)) {
    redirect("/admin/mouqaddams/nouveau?erreur=1");
  }

  const image = imageData(form);
  let target = "/admin/mouqaddams/nouveau?erreur=1";
  try {
    const id = await getStore().addMouqaddam(fields);
    await getStore().setAlsoFrom(id, await alsoFromField(form, id, fields.mouqaddamId));
    if (image) await getStore().setPersonImage(id, image);
    await createBiographyFor(id, fields);
    revalidatePath("/", "layout");
    target = `/admin/mouqaddams/${id}?cree=1`;
  } catch (error) {
    console.error(error);
  }
  redirect(target);
}

export async function createPersonBiography(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  const back = `/admin/mouqaddams/${encodeURIComponent(personId)}`;
  const person = (await getStore().listPersons()).find((candidate) => candidate.id === personId);
  if (!person || person.biographySlug) redirect(`${back}?erreur=1`);

  await attempt(
    () => createBiographyFor(personId, { ...person, name: person.displayName }),
    `${back}?ok=1`,
    `${back}?erreur=1`,
  );
}

// Le titre de la biographie suit la fiche, sauf s'il a été retouché à la main.
async function syncBiography(
  before: PublicPerson,
  after: { name: string; biographySlug: string | null },
  personId: string,
) {
  if (!before.biographySlug || before.biographySlug !== after.biographySlug) return;
  const biography = await getStore().getBiography(before.biographySlug);
  if (!biography) return;

  if (biography.name !== before.displayName || after.name === biography.name) return;

  await getStore().saveBiography({
    slug: biography.slug,
    name: after.name,
    summary: biography.summary,
    body: biography.body,
    sources: biography.sources.join("\n"),
    cover: biography.cover,
    draft: biography.draft,
    localOnly: biography.localOnly,
    personId,
  });
}

export async function updateMouqaddam(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  const page = `/admin/mouqaddams/${encodeURIComponent(personId)}`;
  const fields = await mouqaddamFields(form);
  if (!personId || fields.name.length < 2 || !datesInOrder(fields.birthDate, fields.deathDate)) {
    redirect(`${page}?erreur=1`);
  }

  const before = (await getStore().listPersons()).find((candidate) => candidate.id === personId);
  const image = imageData(form);
  const removeImage = form.get("removeImage") === "on";
  await attempt(
    async () => {
      await getStore().updateMouqaddam(personId, fields);
      await getStore().setAlsoFrom(personId, await alsoFromField(form, personId, fields.mouqaddamId));
      if (image) await getStore().setPersonImage(personId, image);
      else if (removeImage) await getStore().setPersonImage(personId, null);
      if (before) await syncBiography(before, fields, personId);
    },
    `${page}?ok=1`,
    `${page}?erreur=1`,
  );
}

// Depuis le badge « Localisations à compléter » : on reste sur la silsila, sans recharger l'arbre.
export async function setPersonPlace(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  if (!personId) throw new Error("Personne inconnue.");
  for (const kind of ["birth", "death"] as const) {
    await getStore().setPlace(personId, kind, optional(form, `${kind}City`, 120), optional(form, `${kind}Country`, 120));
  }
}

export async function deleteMouqaddam(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  const back = `/admin/mouqaddams/${encodeURIComponent(personId)}?erreur=1`;

  // La racine porte toutes les chaînes : la page ne propose pas sa suppression.
  const persons = await getStore().listPersons();
  const person = persons.find((candidate) => candidate.id === personId);
  const parent = persons.find((candidate) => candidate.id === person?.mouqaddamId);
  if (!person || parent?.kind === "prophet" || person.kind === "prophet" || person.kind === "member") {
    redirect(back);
  }

  await attempt(
    async () => {
      const biography = person.biographySlug ? await getStore().getBiography(person.biographySlug) : null;
      await getStore().deleteMouqaddam(personId);
      // Seule une biographie restée vide part avec sa fiche : un texte écrit n'est jamais perdu.
      if (biography && !biography.body.trim() && biography.sources.length === 0) {
        await getStore().deleteBiography(biography.slug);
      }
    },
    "/admin/mouqaddams?ok=1",
    back,
  );
}

export async function linkMouqaddam(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  const mouqaddamId = text(form, "mouqaddamId", 36);
  if (!personId || !mouqaddamId) redirect("/admin/silsila?erreur=1");

  await attempt(
    () => getStore().linkMouqaddam(personId, mouqaddamId),
    `/admin/silsila?ok=${Date.now()}`,
    "/admin/silsila?erreur=1",
  );
}

export async function resolveRequest(form: FormData) {
  await requireAdmin();
  const id = text(form, "id", 36);
  const status = form.get("status") === "accepted" ? "accepted" : "rejected";
  await attempt(() => getStore().resolveRequest(id, status), "/admin?ok=1", "/admin?erreur=1");
}

// Le slug ne change plus une fois créé : les liens vers la biographie restent valables.
async function freeSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  for (let index = 2; await getStore().getBiography(slug); index++) slug = `${base}-${index}`;
  return slug;
}

export async function saveBiography(form: FormData) {
  await requireAdmin();
  const existing = text(form, "slug", 120);
  const back = existing ? `/biographies/${existing}/modifier` : "/biographies/nouvelle";
  const name = text(form, "name", 120);
  if (name.length < 2) redirect(`${back}?erreur=1`);

  const slug = existing || (await freeSlug(name));
  await attempt(
    () =>
      getStore().saveBiography({
        slug,
        name,
        summary: text(form, "summary", 500),
        body: text(form, "body", 200000),
        sources: text(form, "sources", 50000),
        draft: form.get("draft") === "on",
        localOnly: form.get("localOnly") === "on",
        cover: optional(form, "cover", 200),
        personId: optional(form, "personId", 36),
      }),
    `/biographies/${slug}`,
    `${back}?erreur=1`,
  );
}

export async function setBiographyCover(form: FormData) {
  await requireAdmin();
  const slug = text(form, "slug", 120);
  const cover = optional(form, "cover", 200);
  const back = `/biographies/${slug}`;
  if (cover && !listCovers().includes(cover)) redirect(`${back}?erreur=1`);
  await attempt(() => getStore().setBiographyCover(slug, cover), back, `${back}?erreur=1`);
}

export async function deleteBiography(form: FormData) {
  await requireAdmin();
  const slug = text(form, "slug", 120);
  // Depuis la fiche d'une personne, on y revient après la suppression.
  const from = text(form, "retour", 200);
  const back = from.startsWith("/admin/mouqaddams/") ? from : "/biographies";
  const failure = from.startsWith("/admin/mouqaddams/") ? `${from}?erreur=1` : `/biographies/${slug}/modifier?erreur=1`;
  await attempt(() => getStore().deleteBiography(slug), back, failure);
}

export async function closeReport(form: FormData) {
  await requireAdmin();
  const id = text(form, "id", 36);
  await attempt(() => getStore().closeReport(id), "/admin?ok=1", "/admin?erreur=1");
}

export async function hideReportedPerson(form: FormData) {
  await requireAdmin();
  const id = text(form, "id", 36);
  const personId = text(form, "personId", 36);
  await attempt(
    async () => {
      await getStore().setHidden(personId, true);
      await getStore().closeReport(id);
    },
    "/admin?ok=1",
    "/admin?erreur=1",
  );
}

// Appelée directement par le déroulé du jour, qui affiche déjà le nouvel état.
export async function setWird(day: string, groupId: string, done: boolean) {
  const session = await requireSession();
  // Un jour d'avance toléré : l'appareil peut avoir un autre fuseau que le serveur.
  if (!isWirdDay(day) || day > addDays(todayKey(), 1)) return;
  const { groups } = await loadSuluk(session.userId);
  const abdal = groupId.startsWith("abdal:") ? await getStore().listExercises(session.userId) : [];
  // Une séance entière, une de ses litanies (« séance#nom »), ou un exercice.
  const known =
    groups.some((group) => group.id === groupId || group.items.some((item) => itemKey(group.id, item) === groupId)) ||
    abdal.some((item) => `abdal:${item.id}` === groupId);
  if (!known) return;
  await getStore().setWird(session.userId, day, groupId, done);
  revalidatePath("/suluk");
}

function coordinate(form: FormData, name: string, limit: number) {
  const value = Number(text(form, name, 20).replace(",", "."));
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export async function saveSulukSettings(form: FormData) {
  const session = await requireSession();
  const back = "/suluk/litanies";
  const method = text(form, "method", 20) as PrayerMethod;
  const preset = CITIES.find((city) => city.name === text(form, "city", 120));
  const latitude = preset?.latitude ?? coordinate(form, "latitude", 90);
  const longitude = preset?.longitude ?? coordinate(form, "longitude", 180);
  const city = preset?.name ?? text(form, "cityName", 120);
  // Pour un autre lieu, le formulaire envoie le fuseau de l'appareil.
  const timezone = preset?.timezone ?? text(form, "timezone", 64);
  if (!PRAYER_METHODS.includes(method) || latitude === null || longitude === null || !city || !isTimezone(timezone)) {
    redirect(`${back}?erreur=1#reglages`);
  }
  await attempt(
    () => getStore().saveSulukSettings(session.userId, { city, latitude, longitude, method, timezone }),
    `${back}?ok=1#reglages`,
    `${back}?erreur=1#reglages`,
  );
}

// Les litanies d'une séance arrivent en JSON depuis l'éditeur ; on ne garde que ce qui est valide.
function groupItems(raw: string): LitanyItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) return null;
  const items: LitanyItem[] = [];
  for (const entry of parsed as Record<string, unknown>[]) {
    const name = String(entry?.name ?? "").trim().slice(0, 120);
    const arabic = String(entry?.arabic ?? "").trim().slice(0, 120) || null;
    const note = String(entry?.note ?? "").trim().slice(0, 500) || null;
    const count = entry?.count === null || entry?.count === "" || entry?.count === undefined ? null : Math.round(Number(entry.count));
    const duration = Math.round(Number(entry?.duration));
    if (!name || (count !== null && !(count >= 1 && count <= 1000000)) || !(duration >= 1 && duration <= 600)) return null;
    items.push({ name, arabic, count, note, duration });
  }
  return items;
}

export async function saveGroup(form: FormData) {
  const session = await requireSession();
  const back = "/suluk/litanies";
  const { groups } = await loadSuluk(session.userId);
  const existing = groups.find((group) => group.id === text(form, "id", 64));

  // Une séance enchaînée arrive sous la forme « after:<id> » : elle suit la séance id.
  const rawAnchor = text(form, "anchor", 80);
  const anchor = (rawAnchor.startsWith("after:") ? "after" : rawAnchor) as LitanyGroup["anchor"];
  const follows = anchor === "after" ? rawAnchor.slice("after:".length) : null;
  // On refuse une chaîne qui reviendrait sur la séance elle-même.
  const loops = (start: string | null) => {
    const seen = new Set<string>();
    let current = start;
    while (current) {
      if (current === existing?.id || seen.has(current)) return true;
      seen.add(current);
      const next = groups.find((item) => item.id === current);
      current = next?.anchor === "after" ? next.follows : null;
    }
    return false;
  };
  const time = text(form, "time", 5);
  const offset = Math.round(Number(text(form, "offset", 5) || 0));
  const days = [...new Set(form.getAll("days").map(Number))].filter((day) => day >= 0 && day <= 6).sort();
  const items = groupItems(String(form.get("items") ?? ""));
  const color = text(form, "color", 7);

  const valid =
    items &&
    (GROUP_COLORS as readonly string[]).includes(color) &&
    (anchor === "fixed"
      ? /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      : anchor === "after"
        ? groups.some((item) => item.id === follows) && !loops(follows) && offset >= 0 && offset <= 240
        : PRAYERS.includes(anchor as Prayer)) &&
    Number.isFinite(offset) &&
    Math.abs(offset) <= 720 &&
    days.length > 0;
  if (!valid) redirect(`${back}?erreur=1`);

  const group: LitanyGroup = {
    id: existing?.id ?? crypto.randomUUID(),
    name: optional(form, "name", 120),
    anchor,
    offset: anchor === "fixed" ? 0 : offset,
    time: anchor === "fixed" ? time : null,
    follows,
    days,
    items: items!,
    color,
    position: existing?.position ?? Math.max(-1, ...groups.map((item) => item.position)) + 1,
  };
  await attempt(() => getStore().saveGroup(session.userId, group), `${back}?ok=1`, `${back}?erreur=1`);
}

export async function deleteGroup(form: FormData) {
  const session = await requireSession();
  const id = text(form, "id", 64);
  const { groups } = await loadSuluk(session.userId);
  const removed = groups.find((group) => group.id === id);
  // Les séances qui suivaient celle-ci prennent son moment, pour que la chaîne ne se rompe pas.
  const followers = removed ? groups.filter((group) => group.anchor === "after" && group.follows === id) : [];
  await attempt(
    async () => {
      for (const follower of followers) {
        await getStore().saveGroup(session.userId, {
          ...follower,
          anchor: removed!.anchor,
          offset: removed!.offset,
          time: removed!.time,
          follows: removed!.follows,
        });
      }
      await getStore().deleteGroup(session.userId, id);
    },
    "/suluk/litanies?ok=1",
    "/suluk/litanies?erreur=1",
  );
}

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;
// Les exercices sans plage n'ont qu'une ligne chacun ; le jeûne garde son identifiant d'origine.
const singleId = (kind: ExerciseKind) => (kind === "hunger" ? "faim" : kind);
const NOTED: readonly ExerciseKind[] = ["tafakkur", "ilm", "adab"];

export async function saveExercise(form: FormData) {
  const session = await requireSession();
  const kind = text(form, "kind", 20) as ExerciseKind;
  const days = [...new Set(form.getAll("days").map(Number))].filter((day) => day >= 0 && day <= 6).sort();
  if (!EXERCISE_KINDS.includes(kind)) redirect("/suluk/abdal?erreur=1");
  const back = familyPage(kind);
  const note = NOTED.includes(kind) ? optional(form, "note", 200) : null;
  const practices = await getStore().listExercises(session.userId);
  const position = Math.max(-1, ...practices.map((practice) => practice.position)) + 1;

  if (!SLOT_KINDS.includes(kind)) {
    const id = singleId(kind);
    const save = () =>
      days.length === 0
        ? getStore().deleteExercise(session.userId, id)
        : getStore().saveExercise(session.userId, { id, kind, days, start: null, end: null, note, position });
    await attempt(save, `${back}&ok=1#${kind}`, `${back}&erreur=1#${kind}`);
    return;
  }

  const start = text(form, "start", 5);
  const end = text(form, "end", 5);
  if (!HOUR.test(start) || !HOUR.test(end) || start === end || days.length === 0) redirect(`${back}&erreur=1#${kind}`);
  await attempt(
    () => getStore().saveExercise(session.userId, { id: crypto.randomUUID(), kind, days, start, end, note, position }),
    `${back}&ok=1#${kind}`,
    `${back}&erreur=1#${kind}`,
  );
}

export async function deleteExercise(form: FormData) {
  const session = await requireSession();
  const id = text(form, "id", 64);
  const kind = text(form, "kind", 20) as ExerciseKind;
  const back = EXERCISE_KINDS.includes(kind) ? familyPage(kind) : "/suluk/abdal?";
  await attempt(() => getStore().deleteExercise(session.userId, id), `${back}&ok=1#${kind}`, `${back}&erreur=1`);
}

// Service rendu ou bilan du soir : écrire quelque chose marque aussi l'exercice comme tenu.
export async function saveJournal(day: string, kind: "khidma" | "muhasaba", value: string, exerciseId: string) {
  const session = await requireSession();
  if (!isWirdDay(day) || day > addDays(todayKey(), 1) || (kind !== "khidma" && kind !== "muhasaba")) return;
  const body = value.trim().slice(0, 10000);
  await getStore().saveJournal(session.userId, day, kind, body);
  const practices = await getStore().listExercises(session.userId);
  if (body && practices.some((practice) => practice.id === exerciseId && practice.kind === kind)) {
    await getStore().setWird(session.userId, day, `abdal:${exerciseId}`, true);
  }
  revalidatePath("/suluk");
}

// L'Échiquier : chaque formulaire revient sur la page de la station.
function stationBack(station: string, suffix = "") {
  return `/echiquier/${station}${suffix}`;
}

async function stationOf(form: FormData) {
  const session = await requireSession();
  const station = stationById(text(form, "station", 40));
  if (!station) redirect("/suluk#echiquier");
  const states = await getStore().listStationStates(session.userId);
  const current = states.find((state) => state.station === station.id);
  return { session, station, current };
}

export async function saveStationNote(form: FormData) {
  const { session, station, current } = await stationOf(form);
  await attempt(
    () =>
      getStore().saveStationState(session.userId, {
        station: station.id,
        degree: current?.degree ?? 0,
        note: optional(form, "note", 4000),
        explanation: current?.explanation ?? null,
      }),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

// Vide, l'explication de l'app revient.
export async function saveStationExplanation(form: FormData) {
  const { session, station, current } = await stationOf(form);
  const explanation = optional(form, "explanation", 4000);
  await attempt(
    () =>
      getStore().saveStationState(session.userId, {
        station: station.id,
        degree: current?.degree ?? 0,
        note: current?.note ?? null,
        explanation: explanation === station.explanation ? null : explanation,
      }),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

export async function addStationMoment(form: FormData) {
  const { session, station } = await stationOf(form);
  const body = text(form, "text", 4000);
  const day = text(form, "day", 10) || todayKey();
  if (!body || !isWirdDay(day) || day > todayKey()) redirect(stationBack(station.id, "?erreur=1"));
  await attempt(
    () => getStore().addStationMoment(session.userId, { id: crypto.randomUUID(), station: station.id, day, text: body }),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

export async function deleteStationMoment(form: FormData) {
  const { session, station } = await stationOf(form);
  const id = text(form, "id", 64);
  await attempt(
    () => getStore().deleteStationMoment(session.userId, id),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

export async function setStationFocus(form: FormData) {
  const { session, station } = await stationOf(form);
  const days = Number(text(form, "days", 3));
  if (!FOCUS_LENGTHS.includes(days as (typeof FOCUS_LENGTHS)[number])) redirect(stationBack(station.id, "?erreur=1"));
  const { settings } = await loadSuluk(session.userId);
  await attempt(
    () => getStore().setStationFocus(session.userId, { station: station.id, start: todayKey(settings.timezone), days }),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

export async function clearStationFocus(form: FormData) {
  const { session, station } = await stationOf(form);
  await attempt(
    () => getStore().setStationFocus(session.userId, null),
    stationBack(station.id, "?ok=1"),
    stationBack(station.id, "?erreur=1"),
  );
}

// Nombre de répétitions du verset d'une station, pour un jour donné.
export async function setVerseCount(station: string, day: string, count: number) {
  const session = await requireSession();
  if (!stationById(station) || !isWirdDay(day) || day > addDays(todayKey(), 1)) return;
  const value = Math.max(0, Math.min(100000, Math.round(count)));
  await getStore().saveJournal(session.userId, day, `verset:${station}`, value ? String(value) : "");
  revalidatePath("/echiquier", "layout");
  revalidatePath("/suluk");
}
