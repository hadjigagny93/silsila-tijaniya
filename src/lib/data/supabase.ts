import { createClient } from "@/lib/supabase/server";
import type { DisplayMode, PersonKind, Store } from "./types";

type PublicRow = {
  id: string;
  kind: PersonKind;
  display_name: string;
  city: string | null;
  mouqaddam_id: string | null;
  biography_slug: string | null;
};

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const supabaseStore: Store = {
  async listPersons() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_persons")
      .select("id, kind, display_name, city, mouqaddam_id, biography_slug");
    check(error);
    return ((data ?? []) as PublicRow[]).map((row) => ({
      id: row.id,
      kind: row.kind,
      displayName: row.display_name,
      city: row.city,
      mouqaddamId: row.mouqaddam_id,
      biographySlug: row.biography_slug,
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

  async addMouqaddam({ name, city, mouqaddamId }) {
    const supabase = await createClient();
    check(
      (await supabase
        .from("persons")
        .insert({ kind: "mouqaddam", full_name: name, city, mouqaddam_id: mouqaddamId })).error,
    );
  },

  async linkMouqaddam(personId, mouqaddamId) {
    const supabase = await createClient();
    check((await supabase.from("persons").update({ mouqaddam_id: mouqaddamId }).eq("id", personId)).error);
  },

  async resolveRequest(id, status) {
    const supabase = await createClient();
    check((await supabase.from("mouqaddam_requests").update({ status }).eq("id", id)).error);
  },

  async closeReport(id) {
    const supabase = await createClient();
    check((await supabase.from("reports").update({ status: "closed" }).eq("id", id)).error);
  },

  async setHidden(personId, hidden) {
    const supabase = await createClient();
    check((await supabase.from("persons").update({ hidden }).eq("id", personId)).error);
  },
};
