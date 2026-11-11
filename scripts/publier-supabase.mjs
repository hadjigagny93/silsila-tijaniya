// Publie la base du Mac (la référence) vers Supabase : silsila, photos, biographies, chaînes argentées.
// Le site en ligne reçoit une copie ; les comptes et le Sulûk de chacun en ligne ne sont pas touchés.
//
//   npm run publier -- --essai     compte ce qui serait envoyé, sans rien écrire
//   npm run publier                publie
//
// Il faut dans .env.local : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (jamais dans le code).
// Autre base que celle de l'app : PUBLISH_DB=/chemin/silsila.db npm run publier

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";

const essai = process.argv.includes("--essai");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbPath = process.env.PUBLISH_DB ?? join(homedir(), "Library/Application Support/Silsila Tijaniya/silsila.db");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!existsSync(dbPath)) throw new Error(`Base introuvable : ${dbPath}`);
if (!essai && (!url || !key)) {
  throw new Error("Renseignez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.");
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const rows = (sql) => db.prepare(sql).all();

const biographies = rows("select * from biographies where deleted = 0").map((row) => ({
  slug: row.slug,
  name: row.name,
  period: row.period,
  summary: row.summary,
  body: row.body,
  sources: row.sources,
  draft: row.draft === 1,
  cover: row.cover,
  updated_at: row.updated_at,
}));
const slugs = new Set(biographies.map((row) => row.slug));

const local = rows("select * from persons where deleted = 0");
const ids = new Set(local.map((row) => row.id));
// Parents avant enfants : la base vérifie que chaque maître existe déjà.
const depth = new Map();
const byId = new Map(local.map((row) => [row.id, row]));
const depthOf = (row, seen = new Set()) => {
  if (depth.has(row.id)) return depth.get(row.id);
  const parent = row.mouqaddam_id && byId.get(row.mouqaddam_id);
  const value = parent && !seen.has(parent.id) ? depthOf(parent, seen.add(row.id)) + 1 : 0;
  depth.set(row.id, value);
  return value;
};
const persons = local
  .sort((a, b) => depthOf(a) - depthOf(b))
  .map((row) => ({
    id: row.id,
    kind: row.kind,
    full_name: row.full_name,
    display_mode: row.display_mode,
    city: row.city,
    mouqaddam_id: row.mouqaddam_id && ids.has(row.mouqaddam_id) ? row.mouqaddam_id : null,
    biography_slug: row.biography_slug && slugs.has(row.biography_slug) ? row.biography_slug : null,
    hidden: row.hidden === 1,
    created_at: row.created_at,
    birth_date: row.birth_date,
    death_date: row.death_date,
    birth_city: row.birth_city,
    birth_country: row.birth_country,
    death_city: row.death_city,
    death_country: row.death_country,
    zawiya: row.zawiya,
    nicknames: row.nicknames,
    qutb: row.qutb === "1",
    // Pas de user_id : les comptes du Mac ne sont pas ceux du site.
  }));

const images = rows("select person_id, data, updated_at from person_images where deleted = 0")
  .filter((row) => ids.has(row.person_id))
  .map((row) => ({
    person_id: row.person_id,
    data: Buffer.from(row.data).toString("base64"),
    updated_at: row.updated_at,
  }));

const seenLinks = new Set();
const links = rows("select * from person_links where deleted = 0 order by created_at")
  .filter((row) => ids.has(row.person_id) && ids.has(row.master_id) && row.person_id !== row.master_id)
  .filter((row) => {
    const pair = `${row.person_id}>${row.master_id}`;
    if (seenLinks.has(pair)) return false;
    seenLinks.add(pair);
    return true;
  })
  .map((row) => ({ id: row.id, person_id: row.person_id, master_id: row.master_id, created_at: row.created_at }));

console.log(`Base : ${dbPath}`);
console.log(
  `${persons.length} personnes, ${images.length} photos, ${biographies.length} biographies, ${links.length} chaînes argentées.`,
);
if (essai) {
  console.log("Essai : rien n'a été envoyé.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const check = ({ error }, step) => {
  if (error) throw new Error(`${step} : ${error.message}`);
};
const chunks = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const online = async (table, column) => {
  const values = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    values.push(...data);
    if (data.length < 1000) return values;
  }
};

for (const part of chunks(biographies, 50)) check(await supabase.from("biographies").upsert(part), "Biographies");

// Une biographie ne va qu'à une personne : on libère toutes les attributions avant de les reposer.
check(
  await supabase.from("persons").update({ biography_slug: null }).not("biography_slug", "is", null),
  "Biographies des personnes",
);
for (const part of chunks(persons, 100)) check(await supabase.from("persons").upsert(part), "Personnes");

// Retirées sur le Mac : effacées en ligne. Les fiches des membres inscrits sur le site restent.
const extra = (await online("persons", "id, user_id")).filter((row) => !ids.has(row.id) && !row.user_id);
for (const part of chunks(
  extra.map((row) => row.id),
  100,
)) {
  check(await supabase.from("persons").delete().in("id", part), "Personnes retirées");
}

for (const part of chunks(images, 10)) check(await supabase.from("person_images").upsert(part), "Photos");
const withImage = new Set(images.map((row) => row.person_id));
const staleImages = (await online("person_images", "person_id")).filter(
  (row) => ids.has(row.person_id) && !withImage.has(row.person_id),
);
for (const part of chunks(
  staleImages.map((row) => row.person_id),
  100,
)) {
  check(await supabase.from("person_images").delete().in("person_id", part), "Photos retirées");
}

check(await supabase.from("person_links").delete().not("id", "is", null), "Chaînes argentées");
for (const part of chunks(links, 200)) check(await supabase.from("person_links").insert(part), "Chaînes argentées");

const staleBiographies = (await online("biographies", "slug")).filter((row) => !slugs.has(row.slug));
for (const part of chunks(
  staleBiographies.map((row) => row.slug),
  100,
)) {
  check(await supabase.from("biographies").delete().in("slug", part), "Biographies retirées");
}

console.log(
  `Publié. Retirés en ligne : ${extra.length} personnes, ${staleImages.length} photos, ${staleBiographies.length} biographies.`,
);
