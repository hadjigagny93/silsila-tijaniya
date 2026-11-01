import type { Metadata } from "next";
import { signIn } from "@/app/actions";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.signIn.title };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string }>;
}) {
  const { envoye, erreur } = await searchParams;
  const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="max-w-md">
      <h1 className="text-4xl">{t.signIn.title}</h1>
      <p className="mt-2 text-muted">{t.signIn.intro}</p>
      {demo && <p className="mt-4 rounded-md border border-gold/50 p-3 text-gold">{t.signIn.demo}</p>}
      {envoye && <p role="status" className="mt-4 text-accent">{t.signIn.sent}</p>}
      {erreur && <p role="alert" className="mt-4 text-gold">{t.errors.generic}</p>}

      <form action={signIn} className="mt-6 space-y-3">
        <label className="block">
          {t.signIn.email}
          <input name="email" type="email" required autoComplete="email" className="field mt-1" />
        </label>
        <button className="button">{t.signIn.submit}</button>
      </form>
    </div>
  );
}
