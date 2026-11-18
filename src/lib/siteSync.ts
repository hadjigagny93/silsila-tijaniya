// « Synchroniser avec le site » : le Mac et le site sont deux postes d'admin (l'un hors ligne, l'autre en ligne).
// 1. Récupérer : ce que l'admin du site a modifié (edited_online) ou supprimé (site_deletions) depuis la dernière
//    fois arrive dans la base du Mac ; la version la plus récente gagne, comme entre le Mac et l'iPhone.
// 2. Envoyer : seules les lignes modifiées sur le Mac depuis le dernier envoi partent ; une suppression sur le Mac
//    devient une suppression en ligne. Rien de ce qui a été créé en ligne n'est effacé.
// Sans la migration 0022 en ligne, on garde l'ancienne publication (copie complète du Mac).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SqlDriver } from "@/lib/data/sqlDriver";
import { publish, type PublishResult } from "@/lib/publish";
import { applyChanges, type SyncRow, type SyncRows } from "@/lib/sync";

export type SiteSyncResult =
  | ({ mode: "publication" } & PublishResult)
  | { mode: "synchronisation"; pulled: number; pushed: number; removed: number };

type Online = Record<string, unknown>;
type Local = Record<string, unknown> & { sync_rev: number; deleted: number };

const PAGE = 1000;
const ms = (value: unknown) => Date.parse(String(value));
const bool = (value: unknown) => (value ? 1 : 0);
const flag = (value: unknown) => (value ? "1" : null);
const chunks = <T>(list: T[], size: number) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

// Clé de chaque table, dans la base du Mac comme en ligne.
const KEYS = {
  persons: "id",
  biographies: "slug",
  person_images: "person_id",
  place_images: "person_id",
  person_links: "id",
} as const;
type Table = keyof typeof KEYS;

async function meta(driver: SqlDriver, key: string) {
  return (await driver.get<{ value: string }>("select value from sync_meta where key = ?", [key]))?.value ?? null;
}

async function setMeta(driver: SqlDriver, key: string, value: string) {
  await driver.run(
    "insert into sync_meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value",
    [key, value],
  );
}

function fail(step: string, error: { message: string } | null) {
  if (error) throw new Error(`${step} : ${error.message}`);
}

// --- Récupérer -------------------------------------------------------------------------------------------------

// Une ligne en ligne, telle que la base du Mac la range.
function toLocal(table: Table, row: Online): SyncRow | null {
  const sync_rev = ms(row.updated_at);
  switch (table) {
    case "persons":
      // Les fiches des membres inscrits sur le site ne descendent pas sur le Mac.
      if (row.user_id) return null;
      return {
        id: row.id as string,
        kind: row.kind as string,
        full_name: row.full_name as string,
        display_mode: row.display_mode as string,
        city: (row.city as string) ?? null,
        mouqaddam_id: (row.mouqaddam_id as string) ?? null,
        biography_slug: (row.biography_slug as string) ?? null,
        hidden: bool(row.hidden),
        birth_date: (row.birth_date as string) ?? null,
        death_date: (row.death_date as string) ?? null,
        birth_city: (row.birth_city as string) ?? null,
        birth_country: (row.birth_country as string) ?? null,
        death_city: (row.death_city as string) ?? null,
        death_country: (row.death_country as string) ?? null,
        zawiya: (row.zawiya as string) ?? null,
        nicknames: (row.nicknames as string) ?? null,
        qutb: flag(row.qutb),
        prophet_family: flag(row.prophet_family),
        incognito: flag(row.incognito),
        wird_from_id: (row.wird_from_id as string) ?? null,
        notes: (row.notes as string) ?? null,
        deleted: 0,
        sync_rev,
      };
    case "biographies": {
      const body = String(row.body ?? "");
      return {
        slug: row.slug as string,
        name: row.name as string,
        period: String(row.period ?? ""),
        summary: String(row.summary ?? ""),
        body,
        sources: String(row.sources ?? ""),
        draft: bool(row.draft),
        cover: (row.cover as string) ?? null,
        // Une biographie vide est cachée en ligne d'office : son état « hors ligne » sur le Mac ne change pas.
        ...(body.trim() ? { local_only: bool(row.local_only) } : {}),
        deleted: 0,
        sync_rev,
      };
    }
    case "person_images":
      return { person_id: row.person_id as string, data: { $b64: row.data as string }, deleted: 0, sync_rev };
    case "place_images":
      return {
        person_id: row.person_id as string,
        data: { $b64: row.data as string },
        caption: (row.caption as string) ?? null,
        deleted: 0,
        sync_rev,
      };
    case "person_links":
      return {
        id: row.id as string,
        person_id: row.person_id as string,
        master_id: row.master_id as string,
        deleted: 0,
        sync_rev,
      };
  }
}

async function pull(driver: SqlDriver, supabase: SupabaseClient) {
  const since = (await meta(driver, "site_pulled_at")) ?? "1970-01-01T00:00:00Z";
  let latest = since;
  const incoming: SyncRows = {};
  const pulled = new Set<string>();

  for (const table of Object.keys(KEYS) as Table[]) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("edited_online", true)
        .gt("updated_at", since)
        .order("updated_at")
        .range(from, from + PAGE - 1);
      fail(`Lecture ${table}`, error);
      const page = (data ?? []) as Online[];
      for (const row of page) {
        if (String(row.updated_at) > latest) latest = String(row.updated_at);
        const local = toLocal(table, row);
        if (!local) continue;
        // Plus récente sur le Mac : c'est elle qui partira en ligne à l'envoi.
        const mine = await driver.get<Local>(`select sync_rev from ${table} where ${KEYS[table]} = ?`, [
          local[KEYS[table]] as string,
        ]);
        if (mine && Number(mine.sync_rev) >= Number(local.sync_rev)) continue;
        (incoming[table] ??= []).push(local);
        pulled.add(`${table}:${local[KEYS[table]]}`);
      }
      if (page.length < PAGE) break;
    }
  }

  // Suppressions faites en ligne : appliquées si elles sont plus récentes que la dernière modification sur le Mac.
  const lastDeletion = Number((await meta(driver, "site_deletion_id")) ?? 0);
  const deletions: { table: Table; key: string; at: number }[] = [];
  let deletionCursor = lastDeletion;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("site_deletions")
      .select("*")
      .gt("id", lastDeletion)
      .order("id")
      .range(from, from + PAGE - 1);
    fail("Lecture des suppressions", error);
    const page = data ?? [];
    for (const row of page as { id: number; table_name: string; row_key: string; deleted_at: string }[]) {
      deletionCursor = Math.max(deletionCursor, Number(row.id));
      const table = row.table_name as Table;
      const key = KEYS[table];
      if (!key) continue;
      const local = await driver.get<Local>(`select sync_rev, deleted from ${table} where ${key} = ?`, [row.row_key]);
      if (!local || local.deleted || Number(local.sync_rev) > ms(row.deleted_at)) continue;
      deletions.push({ table, key: row.row_key, at: ms(row.deleted_at) });
      pulled.add(`${table}:${row.row_key}`);
    }
    if (page.length < PAGE) break;
  }

  let written = await applyChanges(driver, incoming);
  // Les suppressions : une marque sur la ligne locale, écrite comme une ligne reçue (l'iPhone la recevra telle quelle).
  if (deletions.length) {
    await driver.transaction(async () => {
      await driver.run("update sync_meta set value = '1' where key = 'applying'");
      for (const { table, key, at } of deletions) {
        await driver.run(`update ${table} set deleted = 1, sync_rev = ? where ${KEYS[table]} = ? and sync_rev <= ?`, [at, key, at]);
        written++;
      }
      await driver.run("update sync_meta set value = '0' where key = 'applying'");
    });
  }
  await setMeta(driver, "site_pulled_at", latest);
  await setMeta(driver, "site_deletion_id", String(deletionCursor));
  return { written, pulled };
}

// --- Envoyer ---------------------------------------------------------------------------------------------------

async function push(driver: SqlDriver, supabase: SupabaseClient, pulled: Set<string>) {
  const since = Number((await meta(driver, "site_pushed_rev")) ?? 0);
  const first = since === 0;
  const startedAt = Date.now();
  let pushed = 0;
  let removed = 0;

  // Les lignes changées sur le Mac depuis le dernier envoi, sans celles qui viennent d'arriver du site.
  const changed = async <T extends Local>(table: Table) =>
    (await driver.all<T>(`select * from ${table} where sync_rev > ?`, [since])).filter(
      (row) => !pulled.has(`${table}:${row[KEYS[table]]}`),
    );
  // La première fois, le grand nettoyage (sweep) retire d'un coup tout ce qui n'existe plus sur le Mac.
  const remove = async (table: Table, keys: string[]) => {
    if (first) return;
    for (const part of chunks(keys, 100)) {
      fail(`Suppression ${table}`, (await supabase.from(table).delete().in(KEYS[table], part)).error);
      removed += part.length;
    }
  };

  const alive = new Set(
    (await driver.all<{ id: string }>("select id from persons where deleted = 0")).map((row) => row.id),
  );
  const liveSlugs = new Set(
    (await driver.all<{ slug: string }>("select slug from biographies where deleted = 0")).map((row) => row.slug),
  );

  // Biographies d'abord : les fiches s'y rattachent.
  const biographies = await changed<Local & { slug: string; body: string; local_only: number }>("biographies");
  await remove(
    "biographies",
    biographies.filter((row) => row.deleted).map((row) => row.slug),
  );
  const bioRows = biographies
    .filter((row) => !row.deleted)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      period: row.period ?? "",
      summary: row.summary ?? "",
      body: row.body ?? "",
      sources: row.sources ?? "",
      draft: row.draft === 1,
      cover: row.cover ?? null,
      // Hors ligne pour le public : gardée sur le Mac, ou encore vide.
      local_only: row.local_only === 1 || !String(row.body ?? "").trim(),
    }));
  for (const part of chunks(bioRows, 50)) {
    fail("Biographies", (await supabase.from("biographies").upsert(part)).error);
    pushed += part.length;
  }

  // Fiches : parents avant enfants, la base en ligne vérifie que chaque maître existe.
  type PersonRow = Local & { id: string; mouqaddam_id: string | null; biography_slug: string | null };
  const persons = await changed<PersonRow>("persons");
  await remove(
    "persons",
    persons.filter((row) => row.deleted).map((row) => row.id),
  );
  const all = new Map(
    (await driver.all<PersonRow>("select id, mouqaddam_id from persons where deleted = 0")).map((row) => [row.id, row]),
  );
  const depth = new Map<string, number>();
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    const parent = all.get(id)?.mouqaddam_id;
    const value = parent && all.has(parent) && !seen.has(parent) ? depthOf(parent, seen.add(id)) + 1 : 0;
    depth.set(id, value);
    return value;
  };
  const living = persons.filter((row) => !row.deleted).sort((a, b) => depthOf(a.id) - depthOf(b.id));
  const slugOf = (row: PersonRow) => (row.biography_slug && liveSlugs.has(row.biography_slug) ? row.biography_slug : null);
  const personRows = living.map((row) => ({
    id: row.id,
    kind: row.kind,
    full_name: row.full_name,
    display_mode: row.display_mode,
    city: row.city ?? null,
    mouqaddam_id: row.mouqaddam_id && alive.has(row.mouqaddam_id) ? row.mouqaddam_id : null,
    hidden: row.hidden === 1,
    birth_date: row.birth_date ?? null,
    death_date: row.death_date ?? null,
    birth_city: row.birth_city ?? null,
    birth_country: row.birth_country ?? null,
    death_city: row.death_city ?? null,
    death_country: row.death_country ?? null,
    zawiya: row.zawiya ?? null,
    nicknames: row.nicknames ?? null,
    qutb: row.qutb === "1",
    prophet_family: row.prophet_family === "1",
    incognito: row.incognito === "1",
    wird_from_id: row.wird_from_id && alive.has(row.wird_from_id as string) ? row.wird_from_id : null,
    notes: row.notes ?? null,
    // Pas de user_id : les comptes du Mac ne sont pas ceux du site.
  }));
  for (const part of chunks(personRows, 100)) {
    fail("Personnes", (await supabase.from("persons").upsert(part)).error);
    pushed += part.length;
  }
  // Biographie de chaque fiche : une biographie ne va qu'à une personne, on libère d'abord celle qui la tenait.
  const assignments = living.map((row) => ({ id: row.id, slug: slugOf(row) }));
  if (first) {
    fail(
      "Biographies des personnes",
      (await supabase.from("persons").update({ biography_slug: null }).not("biography_slug", "is", null)).error,
    );
  } else {
    const taken = assignments.map((row) => row.slug).filter((slug): slug is string => Boolean(slug));
    for (const part of chunks(taken, 100)) {
      fail(
        "Biographies des personnes",
        (await supabase.from("persons").update({ biography_slug: null }).in("biography_slug", part)).error,
      );
    }
    for (const part of chunks(assignments.map((row) => row.id), 100)) {
      fail(
        "Biographies des personnes",
        (await supabase.from("persons").update({ biography_slug: null }).in("id", part)).error,
      );
    }
  }
  for (const { id, slug } of assignments.filter((row) => row.slug)) {
    fail("Biographies des personnes", (await supabase.from("persons").update({ biography_slug: slug }).eq("id", id)).error);
  }

  // Photos et images de lieu : la photo d'un incognito part aussi, la base en ligne la cache au public.
  for (const table of ["person_images", "place_images"] as const) {
    const images = await changed<Local & { person_id: string; data: Uint8Array; caption?: string | null }>(table);
    await remove(
      table,
      images.filter((row) => row.deleted || !alive.has(row.person_id)).map((row) => row.person_id),
    );
    const rows = images
      .filter((row) => !row.deleted && alive.has(row.person_id))
      .map((row) => ({
        person_id: row.person_id,
        data: Buffer.from(row.data).toString("base64"),
        ...(table === "place_images" ? { caption: row.caption ?? null } : {}),
      }));
    for (const part of chunks(rows, table === "place_images" ? 5 : 10)) {
      fail(table === "place_images" ? "Images de lieu" : "Photos", (await supabase.from(table).upsert(part)).error);
      pushed += part.length;
    }
  }

  // Chaînes argentées, ligne par ligne.
  const links = await changed<Local & { id: string; person_id: string; master_id: string }>("person_links");
  const valid = (row: { person_id: string; master_id: string }) =>
    alive.has(row.person_id) && alive.has(row.master_id) && row.person_id !== row.master_id;
  await remove(
    "person_links",
    links.filter((row) => row.deleted || !valid(row)).map((row) => row.id),
  );
  for (const row of links.filter((link) => !link.deleted && valid(link))) {
    const { error } = await supabase
      .from("person_links")
      .upsert({ id: row.id, person_id: row.person_id, master_id: row.master_id });
    // Le même lien existe déjà en ligne sous un autre identifiant : rien à envoyer.
    if (error && !/duplicate|unique/i.test(error.message)) fail("Chaînes argentées", error);
    if (!error) pushed++;
  }

  // Première synchronisation : on retire en ligne ce qui n'existe plus sur le Mac, comme l'ancienne publication,
  // sans toucher aux lignes déjà modifiées en ligne ni aux fiches des membres inscrits.
  if (first) removed += await sweep(driver, supabase);

  await setMeta(driver, "site_pushed_rev", String(startedAt));
  return { pushed, removed };
}

async function sweep(driver: SqlDriver, supabase: SupabaseClient) {
  let removed = 0;
  for (const table of Object.keys(KEYS) as Table[]) {
    const key = KEYS[table];
    const mine = new Set(
      (await driver.all<Record<string, string>>(`select ${key} from ${table} where deleted = 0`)).map((row) => row[key]),
    );
    const stale: string[] = [];
    for (let from = 0; ; from += PAGE) {
      const columns = table === "persons" ? `${key}, edited_online, user_id` : `${key}, edited_online`;
      const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
      fail(`Lecture ${table}`, error);
      const page = (data ?? []) as unknown as Online[];
      for (const row of page) {
        if (!mine.has(row[key] as string) && !row.edited_online && !row.user_id) stale.push(row[key] as string);
      }
      if (page.length < PAGE) break;
    }
    for (const part of chunks(stale, 100)) {
      fail(`Nettoyage ${table}`, (await supabase.from(table).delete().in(key, part)).error);
      removed += part.length;
    }
  }
  return removed;
}

// --- Les deux à la suite ---------------------------------------------------------------------------------------

export async function siteReady(supabase: SupabaseClient) {
  return !(await supabase.from("persons").select("edited_online").limit(1)).error;
}

export async function synchronize(driver: SqlDriver, supabase: SupabaseClient): Promise<SiteSyncResult> {
  if (!(await siteReady(supabase))) {
    return { mode: "publication", ...(await publish((sql) => driver.all(sql), supabase)) };
  }
  const { written, pulled } = await pull(driver, supabase);
  const { pushed, removed } = await push(driver, supabase, pulled);
  return { mode: "synchronisation", pulled: written, pushed, removed };
}
