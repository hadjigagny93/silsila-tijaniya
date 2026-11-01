"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data";
import type { DisplayMode } from "@/lib/data/types";

function text(form: FormData, name: string, max: number) {
  const value = String(form.get(name) ?? "").trim();
  return value.slice(0, max);
}

function optional(form: FormData, name: string, max: number) {
  return text(form, name, max) || null;
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

export async function addMouqaddam(form: FormData) {
  await requireAdmin();
  const name = text(form, "name", 120);
  if (name.length < 2) redirect("/admin?erreur=1");

  await attempt(
    () =>
      getStore().addMouqaddam({
        name,
        city: optional(form, "city", 120),
        mouqaddamId: optional(form, "mouqaddamId", 36),
      }),
    "/admin?ok=1",
    "/admin?erreur=1",
  );
}

export async function linkMouqaddam(form: FormData) {
  await requireAdmin();
  const personId = text(form, "personId", 36);
  const mouqaddamId = text(form, "mouqaddamId", 36);
  if (!personId || !mouqaddamId) redirect("/admin?erreur=1");

  await attempt(() => getStore().linkMouqaddam(personId, mouqaddamId), "/admin?ok=1", "/admin?erreur=1");
}

export async function resolveRequest(form: FormData) {
  await requireAdmin();
  const id = text(form, "id", 36);
  const status = form.get("status") === "accepted" ? "accepted" : "rejected";
  await attempt(() => getStore().resolveRequest(id, status), "/admin?ok=1", "/admin?erreur=1");
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
