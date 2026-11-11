import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/app/actions";
import { Star } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.signIn.title };

// La connexion reprend l'atmosphère des couvertures : nuit, motif, carte claire au centre.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string }>;
}) {
  const { envoye, erreur } = await searchParams;
  if ((await getStore().getSession())?.local) redirect("/mon-compte");

  return (
    <div className="signin-stage">
      <div className="signin-card">
        <span className="mx-auto block w-fit text-gold">
          <Star size={40} />
        </span>
        <h1 className="mt-3 text-center text-[36px]">{t.signIn.title}</h1>
        <p className="page-intro mt-2 text-center text-base">{t.signIn.intro}</p>
        {envoye && <Notice tone="success">{t.signIn.sent}</Notice>}
        {erreur && <Notice tone="error">{t.errors.generic}</Notice>}

        <form action={signIn} className="mt-6 space-y-4">
          <label className="block">
            <span className="field-label">{t.signIn.email}</span>
            <input name="email" type="email" required autoComplete="email" className="field" />
          </label>
          <button className="button w-full">{t.signIn.submit}</button>
        </form>
      </div>
    </div>
  );
}
