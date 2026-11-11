import { createClient } from "@/lib/supabase/server";
import { groupRow, toGroup, type GroupRow } from "./litanyRows";
import type {
  Biography,
  DisplayMode,
  ExerciseKind,
  JournalEntry,
  NewMouqaddam,
  PersonKind,
  StationChange,
  StationFocus,
  StationMoment,
  StationState,
  Store,
} from "./types";

type PublicRow = {
  id: string;
  kind: PersonKind;
  display_name: string;
  city: string | null;
  mouqaddam_id: string | null;
  biography_slug: string | null;
  has_image: boolean;
  birth_date: string | null;
  death_date: string | null;
  birth_city: string | null;
  birth_country: string | null;
  death_city: string | null;
  death_country: string | null;
  zawiya: string | null;
  nicknames: string | null;
};

type BiographyRow = {
  slug: string;
  name: string;
  summary: string;
  body: string;
  sources: string;
  draft: boolean;
  cover: string | null;
};

function toBiography(row: BiographyRow): Biography {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    body: row.body,
    sources: row.sources.split("\n").map((line) => line.trim()).filter(Boolean),
    draft: row.draft,
    cover: row.cover,
  };
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function personColumns(input: NewMouqaddam) {
  return {
    kind: input.kind,
    full_name: input.name,
    mouqaddam_id: input.mouqaddamId,
    birth_date: input.birthDate,
    death_date: input.deathDate,
    birth_city: input.birthCity,
    birth_country: input.birthCountry,
    death_city: input.deathCity,
    death_country: input.deathCountry,
    zawiya: input.zawiya,
    nicknames: input.nicknames.join("\n") || null,
    biography_slug: input.biographySlug,
  };
}

// Une biographie ne décrit qu'une personne : la donner à l'une la retire à l'autre.
async function releaseBiography(slug: string) {
  const supabase = await createClient();
  check((await supabase.from("persons").update({ biography_slug: null }).eq("biography_slug", slug)).error);
}

export const supabaseStore: Store = {
  async listPersons() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_persons")
      .select(
        "id, kind, display_name, city, mouqaddam_id, biography_slug, has_image, birth_date, death_date, birth_city, birth_country, death_city, death_country, zawiya, nicknames",
      );
    check(error);
    return ((data ?? []) as PublicRow[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      displayName: row.display_name,
      city: row.city,
      mouqaddamId: row.mouqaddam_id,
      biographySlug: row.biography_slug,
      hasImage: row.has_image,
      birthDate: row.birth_date,
      deathDate: row.death_date,
      birthCity: row.birth_city,
      birthCountry: row.birth_country,
      deathCity: row.death_city,
      deathCountry: row.death_country,
      zawiya: row.zawiya,
      nicknames: row.nicknames?.split("\n") ?? [],
      qutb: false,
      // Les chaînes argentées ne vivent encore que dans les bases locales (Mac et iPhone).
      alsoFrom: [],
    }));
  },

  async getSession() {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: row, error: rowError }, { data: isAdmin, error: adminError }] = await Promise.all([
      supabase
        .from("persons")
        .select("id, full_name, display_mode, city, mouqaddam_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    check(rowError);
    check(adminError);

    return {
      userId: user.id,
      email: user.email ?? "",
      isAdmin: Boolean(isAdmin),
      profile: row
        ? {
            id: row.id as string,
            fullName: row.full_name as string,
            displayMode: row.display_mode as DisplayMode,
            city: row.city as string | null,
            mouqaddamId: row.mouqaddam_id as string | null,
          }
        : null,
    };
  },

  async signIn(email, redirectTo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    check(error);
    return "email-sent";
  },

  async signOut() {
    const supabase = await createClient();
    check((await supabase.auth.signOut()).error);
  },

  async saveProfile(userId, input) {
    const supabase = await createClient();
    const { error } = await supabase.from("persons").upsert(
      {
        user_id: userId,
        full_name: input.fullName,
        display_mode: input.displayMode,
        city: input.city,
        mouqaddam_id: input.mouqaddamId,
      },
      { onConflict: "user_id" },
    );
    check(error);
  },

  async requestMouqaddam(userId, name, city, note) {
    const supabase = await createClient();
    check((await supabase.from("mouqaddam_requests").insert({ requester_id: userId, name, city, note })).error);
  },

  async reportPerson(userId, personId, reason) {
    const supabase = await createClient();
    check((await supabase.from("reports").insert({ reporter_id: userId, person_id: personId, reason })).error);
  },

  async listRequests() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mouqaddam_requests")
      .select("id, name, city, note")
      .eq("status", "pending")
      .order("created_at");
    check(error);
    return data ?? [];
  },

  async listReports() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reports")
      .select("id, person_id, reason, persons(full_name)")
      .eq("status", "open")
      .order("created_at");
    check(error);
    return ((data ?? []) as unknown as {
      id: string;
      person_id: string;
      reason: string;
      persons: { full_name: string } | null;
    }[]).map((row) => ({
      id: row.id,
      personId: row.person_id,
      personName: row.persons?.full_name ?? "",
      reason: row.reason,
    }));
  },

  async addMouqaddam(input) {
    const supabase = await createClient();
    if (input.biographySlug) await releaseBiography(input.biographySlug);
    const { data, error } = await supabase
      .from("persons")
      .insert(personColumns(input))
      .select("id")
      .single();
    check(error);
    return data!.id as string;
  },

  async updateMouqaddam(personId, input) {
    const supabase = await createClient();
    if (input.biographySlug) await releaseBiography(input.biographySlug);
    check((await supabase.from("persons").update(personColumns(input)).eq("id", personId)).error);
  },

  async deleteMouqaddam(personId) {
    const supabase = await createClient();
    check((await supabase.from("persons").delete().eq("id", personId)).error);
  },

  async setPersonImage(personId, base64) {
    const supabase = await createClient();
    if (!base64) {
      check((await supabase.from("person_images").delete().eq("person_id", personId)).error);
      return;
    }
    check(
      (await supabase.from("person_images").upsert({ person_id: personId, data: base64 }, { onConflict: "person_id" }))
        .error,
    );
  },

  async getPersonImage(personId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("person_images")
      .select("data")
      .eq("person_id", personId)
      .maybeSingle();
    check(error);
    return data ? Buffer.from(data.data as string, "base64") : null;
  },

  async linkMouqaddam(personId, mouqaddamId) {
    const supabase = await createClient();
    check((await supabase.from("persons").update({ mouqaddam_id: mouqaddamId }).eq("id", personId)).error);
  },

  async setPlace(personId, kind, city, country) {
    const supabase = await createClient();
    const fields = kind === "birth" ? { birth_city: city, birth_country: country } : { death_city: city, death_country: country };
    check((await supabase.from("persons").update(fields).eq("id", personId)).error);
  },

  async resolveRequest(id, status) {
    const supabase = await createClient();
    check((await supabase.from("mouqaddam_requests").update({ status }).eq("id", id)).error);
  },

  async closeReport(id) {
    const supabase = await createClient();
    check((await supabase.from("reports").update({ status: "closed" }).eq("id", id)).error);
  },

  async setAlsoFrom() {
    throw new Error("Les chaînes argentées ne sont pas encore disponibles en ligne.");
  },

  async setHidden(personId, hidden) {
    const supabase = await createClient();
    check((await supabase.from("persons").update({ hidden }).eq("id", personId)).error);
  },

  async listBiographies() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("biographies").select("*").order("name");
    check(error);
    return ((data ?? []) as BiographyRow[]).map(toBiography);
  },

  async getBiography(slug) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("biographies").select("*").eq("slug", slug).maybeSingle();
    check(error);
    return data ? toBiography(data as BiographyRow) : null;
  },

  async saveBiography({ personId, ...biography }) {
    const supabase = await createClient();
    check((await supabase.from("biographies").upsert(biography, { onConflict: "slug" })).error);
    check(
      (await supabase.from("persons").update({ biography_slug: null }).eq("biography_slug", biography.slug)).error,
    );
    if (personId) {
      check(
        (await supabase.from("persons").update({ biography_slug: biography.slug }).eq("id", personId)).error,
      );
    }
  },

  async setBiographyCover(slug, cover) {
    const supabase = await createClient();
    check((await supabase.from("biographies").update({ cover }).eq("slug", slug)).error);
  },

  async deleteBiography(slug) {
    const supabase = await createClient();
    check((await supabase.from("persons").update({ biography_slug: null }).eq("biography_slug", slug)).error);
    check((await supabase.from("biographies").delete().eq("slug", slug)).error);
  },
  async getSulukSettings(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suluk_settings")
      .select("city, latitude, longitude, method, timezone")
      .eq("user_id", userId)
      .maybeSingle();
    check(error);
    return data;
  },

  async initSuluk(userId, settings, groups) {
    await this.saveSulukSettings(userId, settings);
    const supabase = await createClient();
    check((await supabase.from("litanies").upsert(groups.map((group) => groupRow(userId, group)))).error);
  },

  async saveSulukSettings(userId, settings) {
    const supabase = await createClient();
    check((await supabase.from("suluk_settings").upsert({ user_id: userId, ...settings })).error);
  },

  async listGroups(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("litanies")
      .select("*")
      .eq("user_id", userId)
      .order("position")
      .order("name");
    check(error);
    return ((data ?? []) as GroupRow[]).map(toGroup);
  },

  async saveGroup(userId, group) {
    const supabase = await createClient();
    check((await supabase.from("litanies").upsert(groupRow(userId, group))).error);
  },

  async deleteGroup(userId, id) {
    const supabase = await createClient();
    check((await supabase.from("litanies").delete().match({ user_id: userId, id })).error);
    check((await supabase.from("wird_log").delete().match({ user_id: userId, litany_id: id })).error);
  },

  async listExercises(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("abdal").select("*").eq("user_id", userId).order("position");
    check(error);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.pillar as ExerciseKind,
      note: row.note as string | null,
      days: [...(row.days as string)].map(Number),
      start: row.start_time as string | null,
      end: row.end_time as string | null,
      position: row.position as number,
    }));
  },

  async saveExercise(userId, { id, kind, days, start, end, note, position }) {
    const supabase = await createClient();
    const row = { user_id: userId, id, pillar: kind, days: days.join(""), start_time: start, end_time: end, note, position };
    check((await supabase.from("abdal").upsert(row)).error);
  },

  async deleteExercise(userId, id) {
    const supabase = await createClient();
    check((await supabase.from("abdal").delete().match({ user_id: userId, id })).error);
    check((await supabase.from("wird_log").delete().match({ user_id: userId, litany_id: `abdal:${id}` })).error);
  },

  async listJournal(userId, from, to) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suluk_journal")
      .select("day, key, text")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to);
    check(error);
    return (data ?? []) as JournalEntry[];
  },

  async saveJournal(userId, day, key, text) {
    const supabase = await createClient();
    const match = { user_id: userId, day, key };
    if (!text) {
      check((await supabase.from("suluk_journal").delete().match(match)).error);
      return;
    }
    check((await supabase.from("suluk_journal").upsert({ ...match, text })).error);
  },

  async listStationStates(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stations")
      .select("station, degree, note, explanation")
      .eq("user_id", userId);
    check(error);
    return (data ?? []) as StationState[];
  },

  async saveStationState(userId, { station, degree, note, explanation }) {
    const supabase = await createClient();
    const { data: previous } = await supabase
      .from("stations")
      .select("degree")
      .match({ user_id: userId, station })
      .maybeSingle();
    const row = { user_id: userId, station, degree, note, explanation, updated_at: new Date().toISOString() };
    check((await supabase.from("stations").upsert(row)).error);
    if ((previous?.degree ?? 0) !== degree) {
      check((await supabase.from("station_history").insert({ user_id: userId, station, degree })).error);
    }
  },

  async listStationHistory(userId, station) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("station_history")
      .select("station, degree, at")
      .match({ user_id: userId, station })
      .order("at", { ascending: false });
    check(error);
    return (data ?? []) as StationChange[];
  },

  async listStationMoments(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("station_moments")
      .select("id, station, day, text")
      .eq("user_id", userId)
      .order("day", { ascending: false });
    check(error);
    return (data ?? []) as StationMoment[];
  },

  async addStationMoment(userId, moment) {
    const supabase = await createClient();
    check((await supabase.from("station_moments").insert({ user_id: userId, ...moment })).error);
  },

  async deleteStationMoment(userId, id) {
    const supabase = await createClient();
    check((await supabase.from("station_moments").delete().match({ user_id: userId, id })).error);
  },

  async getStationFocus(userId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("station_focus")
      .select("station, start, days")
      .eq("user_id", userId)
      .maybeSingle();
    check(error);
    return data as StationFocus | null;
  },

  async setStationFocus(userId, focus) {
    const supabase = await createClient();
    if (!focus) {
      check((await supabase.from("station_focus").delete().eq("user_id", userId)).error);
      return;
    }
    check((await supabase.from("station_focus").upsert({ user_id: userId, ...focus })).error);
  },

  async listWird(userId, from, to) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wird_log")
      .select("day, litany_id")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to)
      .order("day");
    check(error);
    return (data ?? []).map((row) => ({ day: row.day as string, litany: row.litany_id as string }));
  },

  async setWird(userId, day, litany, done) {
    const supabase = await createClient();
    const row = { user_id: userId, day, litany_id: litany };
    if (done) {
      check((await supabase.from("wird_log").upsert(row, { ignoreDuplicates: true })).error);
      return;
    }
    check((await supabase.from("wird_log").delete().match(row)).error);
  },
};
