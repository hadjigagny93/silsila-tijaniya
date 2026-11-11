import { sqliteStore } from "@/lib/data/sqlite";
import { isPaired } from "@/lib/pairing";
import { answerSync, type SyncRequest } from "@/lib/sync";

// Synchronisation avec l'iPhone appairé. Le Mac relaie cette seule adresse sur le réseau local
// (electron/main.cjs) ; sans le jeton d'appairage, rien n'est lu ni écrit.
export async function POST(request: Request) {
  if (!process.env.SQLITE_PATH) return new Response(null, { status: 404 });
  const driver = await sqliteStore.driver();
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!(await isPaired(driver, token))) return Response.json({ error: "non appairé" }, { status: 401 });

  let body: SyncRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "requête illisible" }, { status: 400 });
  }
  if (typeof body?.since !== "number" || typeof body.rows !== "object" || body.rows === null) {
    return Response.json({ error: "requête illisible" }, { status: 400 });
  }
  return Response.json(await answerSync(driver, body));
}
