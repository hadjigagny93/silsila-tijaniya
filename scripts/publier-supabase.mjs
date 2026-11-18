// Publie la base du Mac (la référence) vers Supabase. Même logique que le bouton « Publier sur le site » de l'app.
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
import { collect, countsOf, publish } from "../src/lib/publish.ts";

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
const rows = async (sql) => db.prepare(sql).all();
const describe = (c) => `${c.persons} personnes, ${c.images} photos, ${c.places ?? 0} images de lieu, ${c.biographies} biographies, ${c.links} chaînes argentées`;

console.log(`Base : ${dbPath}`);
if (essai) {
  console.log(`${describe(countsOf(await collect(rows)))}. Essai : rien n'a été envoyé.`);
  process.exit(0);
}

const client = createClient(url, key, { auth: { persistSession: false } });
// Deux admins (migration 0022) : la copie complète effacerait ce que l'admin du site a créé. Seul le bouton
// « Synchroniser avec le site » de l'app Mac sait récupérer ces changements avant d'envoyer.
if (!(await client.from("persons").select("edited_online").limit(1)).error) {
  console.error("Le site a deux admins : utilisez « Synchroniser avec le site » dans l'app Mac. Rien n'a été envoyé.");
  process.exit(1);
}
const result = await publish(rows, client);
const { removed } = result;
console.log(
  `Publié : ${describe(result)}. Retirés en ligne : ${removed.persons} personnes, ${removed.images} photos, ${removed.biographies} biographies.`,
);
