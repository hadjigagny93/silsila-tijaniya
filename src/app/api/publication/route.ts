import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { sqliteStore } from "@/lib/data/sqlite";
import { publish } from "@/lib/publish";

// « Publier sur le site » : seulement dans l'app Mac, dont le serveur n'écoute que sur la machine elle-même.
// La clé de publication (service_role) vit à côté de la base, dans publication.json : jamais dans le code.
const folder = () => dirname(process.env.SQLITE_PATH!);
const lastFile = () => join(folder(), "publication-derniere.json");
const state = globalThis as unknown as { silsilaPublishing?: boolean };

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function config() {
  const found = await readJson<{ url?: string; serviceRoleKey?: string }>(join(folder(), "publication.json"));
  return found?.url && found.serviceRoleKey ? { url: found.url, key: found.serviceRoleKey } : null;
}

export async function GET() {
  if (!process.env.SQLITE_PATH) return new Response(null, { status: 404 });
  return Response.json({ ready: Boolean(await config()), last: await readJson(lastFile()) });
}

export async function POST() {
  if (!process.env.SQLITE_PATH) return new Response(null, { status: 404 });
  const found = await config();
  if (!found) return Response.json({ error: "missing-key" }, { status: 400 });
  if (state.silsilaPublishing) return Response.json({ error: "busy" }, { status: 409 });

  state.silsilaPublishing = true;
  try {
    const driver = await sqliteStore.driver();
    const result = await publish(
      (sql) => driver.all(sql),
      createClient(found.url, found.key, { auth: { persistSession: false } }),
    );
    const last = { at: new Date().toISOString(), ...result };
    await writeFile(lastFile(), JSON.stringify(last, null, 2));
    return Response.json(last);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    state.silsilaPublishing = false;
  }
}
