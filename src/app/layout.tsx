import type { Metadata } from "next";
import { Amiri, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";
import "./globals.css";

const title = Amiri({ variable: "--font-title", subsets: ["latin"], weight: ["400", "700"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: t.site.name, template: `%s · ${t.site.name}` },
  description: t.site.description,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getStore().getSession();

  return (
    <html lang="fr" className={`${title.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4">
            <Link href="/" className="me-auto font-serif text-xl font-bold text-accent">
              {t.site.name}
            </Link>
            <Link href="/silsila">{t.nav.silsila}</Link>
            <Link href="/biographies">{t.nav.biographies}</Link>
            {session?.isAdmin && <Link href="/admin">{t.nav.admin}</Link>}
            {session ? (
              <>
                <Link href="/mon-compte">{t.nav.account}</Link>
                <form action={signOut}>
                  <button className="cursor-pointer text-muted">{t.nav.signOut}</button>
                </form>
              </>
            ) : (
              <Link href="/connexion">{t.nav.signIn}</Link>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
