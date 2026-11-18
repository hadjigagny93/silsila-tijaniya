// Vérifie « Synchroniser avec le site » contre un faux Supabase en mémoire, qui imite la migration 0022
// (updated_at, edited_online, site_deletions, cascades). Rien n'est envoyé au vrai site.
//   npx tsx scripts/site-sync-test.mts <copie-de-la-base-du-mac>
import type { SupabaseClient } from "@supabase/supabase-js";
import { nodeDriver } from "../src/lib/data/nodeDriver";
import { createSqlStore } from "../src/lib/data/sqlStore";
import { synchronize } from "../src/lib/siteSync";

type Row = Record<string, unknown>;
const KEYS: Record<string, string> = {
  persons: "id",
  biographies: "slug",
  person_images: "person_id",
  place_images: "person_id",
  person_links: "id",
  site_deletions: "id",
};
const db: Record<string, Map<string, Row>> = Object.fromEntries(Object.keys(KEYS).map((t) => [t, new Map()]));
// Comme Postgres : des microsecondes, pour départager les écritures d'une même milliseconde sans avancer l'horloge.
let tick = 0;
const now = () => new Date().toISOString().replace("Z", `${String(tick++ % 1000).padStart(3, "0")}Z`);
let deletionId = 0;

function fake(role: "service" | "admin"): SupabaseClient {
  const touch = (row: Row) => ({ ...row, updated_at: now(), edited_online: role === "admin" });
  const logDeletion = (table: string, row: Row) => {
    if (role === "service" || table === "site_deletions") return;
    const id = String(++deletionId);
    db.site_deletions.set(id, { id: deletionId, table_name: table, row_key: String(row[KEYS[table]]), deleted_at: now() });
  };
  const remove = (table: string, key: string) => {
    const row = db[table].get(key);
    if (!row) return;
    db[table].delete(key);
    logDeletion(table, row);
    if (table === "persons") {
      for (const t of ["person_images", "place_images"]) if (db[t].has(key)) remove(t, key);
      for (const [id, link] of db.person_links) if (link.person_id === key || link.master_id === key) remove("person_links", id);
      for (const [id, child] of db.persons) if (child.mouqaddam_id === key) db.persons.set(id, touch({ ...child, mouqaddam_id: null }));
    }
  };

  return {
    from(table: string) {
      const key = KEYS[table];
      const filters: ((row: Row) => boolean)[] = [];
      let action: "select" | "update" | "delete" = "select";
      let patch: Row = {};
      let range: [number, number] | null = null;
      let order: string | null = null;
      let limit: number | null = null;
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return builder;
        },
        gt(column: string, value: unknown) {
          filters.push((row) => (row[column] as string | number) > (value as string | number));
          return builder;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return builder;
        },
        not(column: string) {
          filters.push((row) => row[column] !== null && row[column] !== undefined);
          return builder;
        },
        order(column: string) {
          order = column;
          return builder;
        },
        range(from: number, to: number) {
          range = [from, to];
          return builder;
        },
        limit(count: number) {
          limit = count;
          return builder;
        },
        update(values: Row) {
          action = "update";
          patch = values;
          return builder;
        },
        delete() {
          action = "delete";
          return builder;
        },
        upsert(rows: Row | Row[]) {
          for (const row of [rows].flat()) {
            if (table === "person_links") {
              const duplicate = [...db.person_links.values()].find(
                (link) => link.person_id === row.person_id && link.master_id === row.master_id && link.id !== row.id,
              );
              if (duplicate) return Promise.resolve({ data: null, error: { message: "duplicate key value violates unique" } });
            }
            const existing = db[table].get(String(row[key]));
            db[table].set(String(row[key]), touch({ ...(existing ?? {}), ...row }));
          }
          return Promise.resolve({ data: null, error: null });
        },
        insert(rows: Row | Row[]) {
          for (const row of [rows].flat()) {
            const full = { ...row, [key]: row[key] ?? crypto.randomUUID() };
            db[table].set(String(full[key]), touch(full));
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve: (value: { data: Row[] | null; error: null }) => void) {
          let rows = [...db[table].entries()].filter(([, row]) => filters.every((f) => f(row)));
          if (action === "update") {
            for (const [k, row] of rows) db[table].set(k, touch({ ...row, ...patch }));
            return resolve({ data: null, error: null });
          }
          if (action === "delete") {
            for (const [k] of rows) remove(table, k);
            return resolve({ data: null, error: null });
          }
          if (order) rows = rows.sort(([, a], [, b]) => String(a[order!]).localeCompare(String(b[order!])));
          let data = rows.map(([, row]) => row);
          if (range) data = data.slice(range[0], range[1] + 1);
          if (limit !== null) data = data.slice(0, limit);
          resolve({ data, error: null });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const mac = fake("service");
const admin = fake("admin");
const store = createSqlStore(() => nodeDriver(process.argv[2]), { seedWhenEmpty: true });
const driver = await store.driver();
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? "OK " : "ÉCHEC"} ${label}`);
  if (!ok) process.exitCode = 1;
};
const wait = () => new Promise((resolve) => setTimeout(resolve, 15));
const local = (id: string) => driver.get<Row>("select * from persons where id = ?", [id]);
const sync = async () => {
  await wait();
  const result = await synchronize(driver, mac);
  await wait();
  return result as Extract<Awaited<ReturnType<typeof synchronize>>, { mode: "synchronisation" }>;
};

// Le site a déjà la migration : une colonne edited_online existe (le faux site la renvoie toujours).
db.persons.set("seed", { id: "seed", full_name: "Ancien", kind: "member", edited_online: false, updated_at: now() });

// 1. Première synchronisation : tout part, l'ancienne fiche absente du Mac est retirée.
let result = await sync();
const livePersons = (await driver.all<Row>("select id from persons where deleted = 0")).length;
const liveBios = (await driver.all<Row>("select slug from biographies where deleted = 0")).length;
const liveImages = (await driver.all<Row>("select person_id from person_images where deleted = 0")).length;
console.log("   première :", result);
check("première : toutes les fiches en ligne", db.persons.size === livePersons);
check("première : toutes les biographies en ligne (vides et brouillons compris)", db.biographies.size === liveBios);
check("première : toutes les photos en ligne", db.person_images.size === liveImages);
check("première : l'ancienne fiche absente du Mac est retirée", !db.persons.has("seed"));
const empty = await driver.get<Row>("select slug from biographies where deleted = 0 and trim(body) = '' limit 1");
check("une biographie vide est cachée au public", !empty || db.biographies.get(String(empty.slug))?.local_only === true);

// 2. Une deuxième synchronisation n'a rien à faire.
result = await sync();
check(`rien de neuf : ${result.pulled} récupérés, ${result.pushed} envoyés`, result.pulled === 0 && result.pushed === 0);

const ids = [...db.persons.values()].filter((row) => row.kind === "mouqaddam").map((row) => String(row.id));
const [x, y, z, w, v, u] = ids;

// 3. L'admin du site modifie une fiche et écrit une note : le Mac la récupère, sans la renvoyer.
await admin.from("persons").update({ full_name: "Nom changé en ligne", notes: "note en ligne" }).eq("id", x);
result = await sync();
check("modification en ligne récupérée", (await local(x))?.full_name === "Nom changé en ligne");
check("note en ligne récupérée", (await store.getPersonNotes(x)) === "note en ligne");
check(`pas d'écho (${result.pushed} envoyés)`, result.pushed === 0);

// 4. L'admin du site crée une fiche : elle arrive sur le Mac et reste en ligne.
const created = crypto.randomUUID();
await admin.from("persons").insert({ id: created, kind: "mouqaddam", full_name: "Créé en ligne", display_mode: "full", hidden: false, mouqaddam_id: x });
await sync();
check("création en ligne récupérée", (await local(created))?.full_name === "Créé en ligne");
check("création en ligne pas effacée", db.persons.has(created));

// 5. L'admin du site supprime une fiche : supprimée sur le Mac aussi.
await admin.from("persons").delete().eq("id", y);
await sync();
check("suppression en ligne appliquée sur le Mac", (await local(y))?.deleted === 1);

// 6. Le Mac modifie une fiche : elle part en ligne.
await driver.run("update persons set zawiya = 'Zawiya du Mac' where id = ?", [z]);
result = await sync();
check("modification du Mac envoyée", db.persons.get(z)?.zawiya === "Zawiya du Mac");
check(`seule la fiche modifiée part (${result.pushed} envoyées)`, result.pushed === 1);

// 7. Conflits : la plus récente gagne.
await driver.run("update persons set city = 'Mac (ancien)' where id = ?", [w]);
await wait();
await admin.from("persons").update({ city: "Site (récent)" }).eq("id", w);
await admin.from("persons").update({ city: "Site (ancien)" }).eq("id", v);
await wait();
await driver.run("update persons set city = 'Mac (récent)' where id = ?", [v]);
await sync();
check("conflit : le site plus récent gagne sur le Mac", (await local(w))?.city === "Site (récent)");
check("conflit : le site garde sa version récente", db.persons.get(w)?.city === "Site (récent)");
check("conflit : le Mac plus récent gagne en ligne", db.persons.get(v)?.city === "Mac (récent)");
check("conflit : le Mac garde sa version récente", (await local(v))?.city === "Mac (récent)");

// 8. Le Mac supprime une fiche : elle disparaît en ligne.
await store.deleteMouqaddam(u);
await sync();
check("suppression du Mac envoyée", !db.persons.has(u));

// 9. Biographie modifiée en ligne et chaîne argentée ajoutée en ligne.
const bio = [...db.biographies.values()].find((row) => String(row.body ?? "").trim());
await admin.from("biographies").update({ body: "Texte réécrit en ligne" }).eq("slug", bio!.slug);
await admin.from("person_links").insert({ person_id: z, master_id: x });
await sync();
check("biographie modifiée en ligne récupérée", (await store.getBiography(String(bio!.slug)))?.body === "Texte réécrit en ligne");
const silver = await driver.all<Row>("select * from person_links where person_id = ? and master_id = ? and deleted = 0", [z, x]);
check("chaîne argentée ajoutée en ligne récupérée", silver.length === 1);

// 10. Incognito avec photo sur le Mac : la photo part (le site la cache au public).
const withPhoto = await driver.get<Row>(
  "select person_id from person_images join persons on persons.id = person_id where person_images.deleted = 0 and persons.deleted = 0 limit 1",
);
if (withPhoto) {
  await driver.run("update persons set incognito = '1' where id = ?", [withPhoto.person_id as string]);
  await sync();
  check("incognito : drapeau envoyé, photo gardée en ligne", db.persons.get(String(withPhoto.person_id))?.incognito === true && db.person_images.has(String(withPhoto.person_id)));
}

// 11. Tout est stable : une dernière synchronisation n'a rien à faire.
await sync();
result = await sync();
check(`stable à la fin : ${result.pulled} récupérés, ${result.pushed} envoyés`, result.pulled === 0 && result.pushed === 0);
