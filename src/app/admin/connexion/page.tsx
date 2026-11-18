import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signInAdmin } from "@/app/actions";
import { Star } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.adminSignIn.title, robots: { index: false, follow: false } };

// Connexion des deux admins du site : e-mail et mot de passe, comptes créés dans Supabase.
export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; refuse?: string }>;
}) {
  const { erreur, refuse } = await searchParams;
  const session = await getStore().getSession();
  if (session?.isAdmin) redirect("/admin/mouqaddams");
  const m = t.adminSignIn;

  return (
    <div className="signin-stage">
      <div className="signin-card">
        <span className="mx-auto block w-fit text-gold">
          <Star size={40} />
        </span>
        <h1 className="mt-3 text-center text-[36px]">{m.title}</h1>
        <p className="page-intro mt-2 text-center text-base">{m.intro}</p>
        {erreur && <Notice tone="error">{m.error}</Notice>}
        {refuse && <Notice tone="error">{m.refused}</Notice>}

        <form action={signInAdmin} className="mt-6 space-y-4">
          <label className="block">
            <span className="field-label">{m.email}</span>
            <input name="email" type="email" required autoComplete="username" className="field" />
          </label>
          <label className="block">
            <span className="field-label">{m.password}</span>
            <input name="password" type="password" required autoComplete="current-password" className="field" />
          </label>
          <button className="button w-full">{m.submit}</button>
        </form>
      </div>
    </div>
  );
}
