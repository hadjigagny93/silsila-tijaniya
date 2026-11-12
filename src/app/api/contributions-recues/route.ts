import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isChoosableMouqaddam } from "@/lib/chain";
import { type Contribution, splitPlace } from "@/lib/contributions";
import { getStore } from "@/lib/data";
import { slugify } from "@/lib/slug";
import { t } from "@/messages/fr";

// Boîte de réception des contributions, dans l'app Mac seulement : elle lit Supabase avec la clé de publication
// (publication.json, à côté de la base) et applique ce qui est accepté à la base du Mac. Le site ne change
// qu'à la publication suivante.

async function supabase() {
  try {
    const found = JSON.parse(await readFile(join(dirname(process.env.SQLITE_PATH!), "publication.json"), "utf8"));
    if (!found?.url || !found?.serviceRoleKey) return null;
    return createClient(found.url, found.serviceRoleKey, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

type Row = {
  id: string;
  kind: Contribution["kind"];
  person_id: string | null;
  payload: Contribution["payload"];
  photo: string | null;
  contributor_name: string | null;
  contributor_contact: string | null;
  status: Contribution["status"];
  result_id: string | null;
  created_at: string;
};

const toContribution = (row: Row): Contribution => ({
  id: row.id,
  kind: row.kind,
  personId: row.person_id,
  payload: row.payload ?? {},
  photo: row.photo,
  contributorName: row.contributor_name,
  contributorContact: row.contributor_contact,
  status: row.status,
  resultId: row.result_id,
  createdAt: row.created_at,
});

export async function GET(request: Request) {
  if (!process.env.SQLITE_PATH) return new Response(null, { status: 404 });
  const client = await supabase();
  if (!client) return Response.json({ error: "missing-key" }, { status: 400 });
  const done = new URL(request.url).searchParams.get("statut") === "traitees";
  const query = client.from("contributions").select("*").order("created_at", { ascending: false }).limit(100);
  const { data, error } = done ? await query.neq("status", "new") : await query.eq("status", "new");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { count } = await client.from("contributions").select("id", { count: "exact", head: true }).eq("status", "new");
  return Response.json({ items: (data as Row[]).map(toContribution), pending: count ?? 0 });
}

// « vers 1935 » ou « 1935 » : ce que la fiche sait garder ; le reste va dans le texte de la biographie.
function year(value: string | undefined) {
  const found = /\b(vers\s+)?(\d{4})\b/i.exec(value ?? "");
  return found ? `${found[1] ? "vers " : ""}${found[2]}` : null;
}

async function freeSlug(name: string) {
  const store = getStore();
  const base = slugify(name);
  let slug = base;
  for (let index = 2; await store.getBiography(slug); index++) slug = `${base}-${index}`;
  return slug;
}

const dateLabel = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function sourceLine(item: Contribution) {
  const parts = [item.payload.sourceKind, item.payload.source].filter(Boolean);
  return parts.length ? `${parts.join(" : ")} (${item.contributorName || "contribution"}, ${dateLabel(item.createdAt)})` : "";
}

async function acceptMouqaddam(item: Contribution) {
  const store = getStore();
  const data = item.payload;
  const persons = await store.listPersons();
  const canTransmit = (id: string | null | undefined) =>
    persons.find((person) => person.id === id && (person.kind === "prophet" || isChoosableMouqaddam(person)))?.id ?? null;
  const birth = splitPlace(data.birthPlace);
  const death = splitPlace(data.deathPlace);
  const name = (data.name ?? "").trim();

  const personId = await store.addMouqaddam({
    name,
    mouqaddamId: canTransmit(data.masterId),
    kind: "mouqaddam",
    birthDate: year(data.birthDate),
    deathDate: year(data.deathDate),
    birthCity: birth.city,
    birthCountry: birth.country,
    deathCity: death.city,
    deathCountry: death.country,
    zawiya: data.zawiya || null,
    nicknames: [...new Set((data.nicknames ?? "").split(",").map((nickname) => nickname.trim()).filter(Boolean))],
    qutb: false,
    prophetFamily: false,
    biographySlug: null,
  });
  const alsoFrom = canTransmit(data.alsoFromId);
  if (alsoFrom && alsoFrom !== canTransmit(data.masterId)) await store.setAlsoFrom(personId, [alsoFrom]);
  if (item.photo) await store.setPersonImage(personId, item.photo);

  // Ce que la fiche ne sait pas ranger (dates approximatives, maître hors de l'arbre) reste dans la biographie.
  const facts = [
    data.masterName && `Maître indiqué : ${data.masterName} (pas encore dans l'arbre).`,
    data.birthDate && `Naissance : ${[data.birthDate, data.birthPlace].filter(Boolean).join(", ")}.`,
    data.deathDate && `Décès : ${[data.deathDate, data.deathPlace].filter(Boolean).join(", ")}.`,
  ].filter(Boolean);
  const body = [data.notes, facts.length ? `## ${t.inbox.contributedBy(item.contributorName, dateLabel(item.createdAt))}\n\n${facts.join("\n\n")}` : ""]
    .filter(Boolean)
    .join("\n\n");
  await store.saveBiography({
    slug: await freeSlug(name),
    name,
    summary: "",
    body,
    sources: sourceLine(item),
    draft: true,
    localOnly: true,
    cover: null,
    personId,
  });
  return { resultId: personId, href: `/admin/mouqaddams/${personId}` };
}

async function acceptBiography(item: Contribution) {
  const store = getStore();
  const person = (await store.listPersons()).find((candidate) => candidate.id === item.personId);
  if (!person) throw new Error("person");
  const heading = `## ${t.inbox.contributedBy(item.contributorName, dateLabel(item.createdAt))}`;
  const addition = `${heading}\n\n${item.payload.text ?? ""}`.trim();
  const existing = person.biographySlug ? await store.getBiography(person.biographySlug) : null;
  const source = sourceLine(item);

  const slug = existing?.slug ?? (await freeSlug(person.displayName));
  await store.saveBiography({
    slug,
    name: existing?.name ?? person.displayName,
    summary: existing?.summary ?? "",
    body: [existing?.body.trim(), addition].filter(Boolean).join("\n\n"),
    sources: [...(existing?.sources ?? []), source].filter(Boolean).join("\n"),
    draft: existing?.draft ?? true,
    localOnly: existing?.localOnly ?? true,
    cover: existing?.cover ?? null,
    personId: person.id,
  });
  if (item.photo && !person.hasImage) await store.setPersonImage(person.id, item.photo);
  return { resultId: slug, href: `/biographies/${slug}/modifier` };
}

export async function POST(request: Request) {
  if (!process.env.SQLITE_PATH) return new Response(null, { status: 404 });
  const client = await supabase();
  if (!client) return Response.json({ error: "missing-key" }, { status: 400 });
  const { id, action } = (await request.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!id || !["accept", "reject", "done"].includes(action ?? "")) return Response.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await client.from("contributions").select("*").eq("id", id).single();
  if (error || !data) return Response.json({ error: "not-found" }, { status: 404 });
  const item = toContribution(data as Row);

  try {
    let result: { resultId: string | null; href: string | null } = { resultId: null, href: null };
    let status: Contribution["status"] = action === "reject" ? "rejected" : "done";
    if (action === "accept") {
      if (item.status !== "new") return Response.json({ error: "already" }, { status: 409 });
      result = item.kind === "mouqaddam" ? await acceptMouqaddam(item) : await acceptBiography(item);
      status = "accepted";
    }
    const update = await client
      .from("contributions")
      .update({ status, result_id: result.resultId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (update.error) throw new Error(update.error.message);
    return Response.json({ ok: true, status, href: result.href });
  } catch (failure) {
    console.error(failure);
    return Response.json({ error: failure instanceof Error ? failure.message : String(failure) }, { status: 500 });
  }
}
