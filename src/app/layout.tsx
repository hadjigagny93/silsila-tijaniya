import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Icon, Star } from "@/components/Icon";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { generationsOf } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";
// Polices intégrées à l'app : elle fonctionne aussi sans internet.
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/source-sans-3";
import "@fontsource/amiri/400.css";
import "./globals.css";

// Les données vivent en base : aucune page ne doit être figée au build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: t.site.name, template: `%s · ${t.site.name}` },
  description: t.site.description,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = getStore();
  const [session, persons] = await Promise.all([store.getSession(), store.listPersons()]);
  const generationCount = new Set(generationsOf(persons).values()).size;
  const saved = (await cookies()).get("theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : undefined;

  return (
    <html lang="fr" data-theme={theme}>
      <body className="min-h-dvh md:flex">
        <ThemeToggle initialDark={theme === "dark"} />
        <aside className="shrink-0 border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-(--sidebar-width) md:border-e md:border-b-0">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 pe-16 md:h-full md:flex-col md:flex-nowrap md:items-stretch md:gap-1 md:p-4">
            <Link href="/" className="site-name me-auto px-3 py-2 md:me-0 md:mb-6">
              <Star />
              <span>
                <strong>{t.site.short}</strong>
                <small>{t.site.tagline}</small>
              </span>
            </Link>
            {/* « Ajouter une silsila » se fait depuis la page Silsila : elle reste allumée sur /admin/silsila. */}
            <NavLink href="/silsila" icon="tree" also="/admin/silsila">{t.nav.silsila}</NavLink>
            <NavLink href="/biographies" icon="book">{t.nav.biographies}</NavLink>
            <NavLink href="/suluk" icon="path">{t.nav.suluk}</NavLink>
            {session?.isAdmin && (
              <>
                <NavLink href="/admin/mouqaddams" icon="users">{t.nav.adminMouqaddams}</NavLink>
                {!session.local && <NavLink href="/admin" icon="shield">{t.nav.adminModeration}</NavLink>}
              </>
            )}

            <p className="sidebar-stats">
              {t.nav.stats(persons.length, generationCount)}
              {session?.local && <span className="block">{t.nav.offline}</span>}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 md:mt-3 md:flex-col md:items-stretch md:gap-1 md:border-t md:border-line md:pt-3">
              {session ? (
                <>
                  <NavLink href="/mon-compte" icon="user">{t.nav.account}</NavLink>
                  {!session.local && (
                    <form action={signOut}>
                      <button className="nav-link w-full cursor-pointer text-start text-muted">
                        <Icon name="logout" />
                        {t.nav.signOut}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <NavLink href="/connexion" icon="user">{t.nav.signIn}</NavLink>
              )}
            </div>
          </nav>
        </aside>
        <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
