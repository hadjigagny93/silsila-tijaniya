import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOCAL_ONLY =
  /^\/(suluk|echiquier|connexion|mon-compte|admin|auth|appairage)(\/|$)|^\/biographies\/(nouvelle|[^/]+\/modifier)\/?$/;

export async function proxy(request: NextRequest) {
  // En ligne, le site se lit seulement : le Suluk et l'Échiquier restent dans les apps Mac et iPhone,
  // et il n'y a pas encore de comptes (connexion, mon compte, admin, modification des biographies).
  if (!process.env.SQLITE_PATH && LOCAL_ONLY.test(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
