import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestMouqaddam, saveProfile } from "@/app/actions";
import { isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.account.title };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");

  const profile = session.profile;
  const mouqaddams = (await store.listPersons())
    .filter((person) => isChoosableMouqaddam(person) && person.id !== profile?.id)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  return (
    <div className="max-w-lg">
      <h1 className="text-4xl">{t.account.title}</h1>
      <p className="mt-1 text-muted">{session.email}</p>

      {ok && (
        <p role="status" className="mt-4 text-accent">
          {ok === "demande" ? t.account.missingSent : t.account.saved}
        </p>
      )}
      {erreur && <p role="alert" className="mt-4 text-gold">{t.errors.invalid}</p>}

      <section className="mt-8">
        <h2 className="text-2xl">{t.account.profile}</h2>
        <form action={saveProfile} className="mt-3 space-y-4">
          <label className="block">
            {t.account.fullName}
            <input name="fullName" required minLength={2} maxLength={120} defaultValue={profile?.fullName} className="field mt-1" />
          </label>

          <fieldset>
            <legend>{t.account.display}</legend>
            <label className="mt-1 flex items-center gap-2">
              <input type="radio" name="displayMode" value="full" defaultChecked={profile?.displayMode !== "short"} />
              {t.account.displayFull}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="displayMode" value="short" defaultChecked={profile?.displayMode === "short"} />
              {t.account.displayShort}
            </label>
            <p className="text-sm text-muted">{t.account.displayShortHelp}</p>
          </fieldset>

          <label className="block">
            {t.account.city}
            <input name="city" maxLength={120} defaultValue={profile?.city ?? ""} className="field mt-1" />
          </label>

          <label className="block">
            {t.account.mouqaddam}
            <select name="mouqaddamId" defaultValue={profile?.mouqaddamId ?? ""} className="field mt-1">
              <option value="">{t.account.chooseMouqaddam}</option>
              {mouqaddams.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                  {person.city ? ` (${person.city})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-4">
            <button className="button">{t.account.save}</button>
            {profile && (
              <Link href={`/silsila/${profile.id}`} className="text-accent underline">
                {t.account.viewChain}
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-2xl">{t.account.missingTitle}</h2>
        <p className="mt-1 text-muted">{t.account.missingText}</p>
        <form action={requestMouqaddam} className="mt-3 space-y-3">
          <label className="block">
            {t.account.missingName}
            <input name="name" required minLength={2} maxLength={120} className="field mt-1" />
          </label>
          <label className="block">
            {t.account.city}
            <input name="city" maxLength={120} className="field mt-1" />
          </label>
          <label className="block">
            {t.account.missingNote}
            <textarea name="note" rows={2} maxLength={1000} className="field mt-1" />
          </label>
          <button className="button-quiet">{t.account.missingSend}</button>
        </form>
      </section>
    </div>
  );
}
