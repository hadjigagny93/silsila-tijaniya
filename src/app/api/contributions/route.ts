import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cleanContribution } from "@/lib/contributions";

// Dépôt d'une contribution depuis le site. Sans compte : un champ piège contre les robots, un délai minimal
// de saisie, et une fonction Supabase qui limite le nombre d'envois par appareil.
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return Response.json({ error: "unavailable" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  // Un humain ne remplit pas le champ caché et met plus de quelques secondes à écrire.
  const opened = Number(body.openedAt);
  if (body.website || !Number.isFinite(opened) || Date.now() - opened < 4000) {
    return Response.json({ ok: true });
  }
  const input = cleanContribution(body);
  if (!input) return Response.json({ error: "invalid" }, { status: 400 });

  const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const client = createHash("sha256")
    .update(`${address}|${request.headers.get("user-agent") ?? ""}|${anonKey.slice(-12)}`)
    .digest("hex");

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("submit_contribution", {
    p_kind: input.kind,
    p_person_id: input.personId,
    p_payload: input.payload,
    p_photo: input.photo,
    p_name: input.name,
    p_contact: input.contact,
    p_client: client,
  });
  if (error) {
    if (error.message.includes("rate-limit")) return Response.json({ error: "rate-limit" }, { status: 429 });
    console.error(error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
