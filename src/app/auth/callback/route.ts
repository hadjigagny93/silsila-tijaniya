import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien du mail de connexion. Avec token_hash (modèle d'e-mail de Supabase réglé sur ce lien), il marche
// depuis n'importe quel navigateur ou appareil ; l'ancien lien avec `code` exige le navigateur de la demande.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}/mon-compte`);
    console.error("Connexion (token_hash) :", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/mon-compte`);
    console.error("Connexion (code) :", error.message);
  } else {
    console.error("Connexion : lien sans jeton", searchParams.toString());
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=1`);
}
