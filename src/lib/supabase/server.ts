import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : proxy.ts rafraîchit la session.
          }
        },
      },
    },
  );
}

// Un cookie de session Supabase (sb-…-auth-token, parfois coupé en .0, .1) : sans lui, personne n'est connecté.
export async function hasAuthCookie() {
  return (await cookies()).getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}
