import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// L'admin (et la modification des biographies) s'ouvre en ligne aux deux admins, connectés par mot de passe :
// chaque page vérifie elle-même que la session est celle d'un admin.
const LOCAL_ONLY = /^\/(suluk|echiquier|connexion|mon-compte|auth|appairage)(\/|$)/;

export async function proxy(request: NextRequest) {
  // En ligne, le site se lit seulement : le Suluk et l'Échiquier restent dans les apps Mac et iPhone,
  // et il n'y a pas de comptes de membres (connexion par lien, mon compte).
  if (!process.env.SQLITE_PATH && LOCAL_ONLY.test(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Visiteur sans session : rien à rafraîchir, on ne réveille pas Supabase (le calcul est compté par Vercel).
  const signedIn = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  if (!signedIn) return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Ni les photos (elles vérifient elles-mêmes la session) ni les fichiers statiques.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/personnes/|images/|images-cover/|images-stations/|cover-suluk/|videos/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|mp4|webm|ico|txt|xml)$).*)",
  ],
};
