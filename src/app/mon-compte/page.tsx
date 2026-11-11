import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestMouqaddam, saveProfile } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { PersonPicker } from "@/components/PersonPicker";
import { Segmented } from "@/components/Segmented";
import { ThemePreference } from "@/components/ThemePreference";
import { isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { personDetails } from "@/lib/personDetails";
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

  const saved = (await cookies()).get("theme")?.value;
  const theme = saved === "light" || saved === "dark" ? saved : "system";
  const profile = session.profile;
  const persons = await store.listPersons();
  const mouqaddams = persons
    .filter((person) => isChoosableMouqaddam(person) && person.id !== profile?.id)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  return (
    <div className="max-w-5xl">
      <h1 className="page-title">{t.account.title}</h1>
      {session.email && <p className="page-intro">{session.email}</p>}
      {ok && <Notice tone="success">{ok === "demande" ? t.account.missingSent : t.account.saved}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2>{t.account.profile}</h2>
          <form action={saveProfile} className="mt-4 space-y-5">
            <label className="block">
              <span className="field-label">{t.account.fullName}</span>
              <input name="fullName" required minLength={2} maxLength={120} defaultValue={profile?.fullName} className="field" />
            </label>

            <div>
              <span className="field-label">{t.account.display}</span>
              <Segmented
                name="displayMode"
                label={t.account.display}
                defaultValue={profile?.displayMode === "short" ? "short" : "full"}
                options={[
                  { value: "full", label: t.account.displayFull },
                  { value: "short", label: t.account.displayShort },
                ]}
              />
              <p className="field-help">{t.account.displayShortHelp}</p>
            </div>

            <label className="block">
              <span className="field-label">{t.account.city}</span>
              <input name="city" maxLength={120} defaultValue={profile?.city ?? ""} className="field" />
            </label>

            <div>
              <span className="field-label">{t.account.mouqaddam}</span>
              <PersonPicker
                name="mouqaddamId"
                persons={mouqaddams}
                defaultValue={profile?.mouqaddamId ?? ""}
                label={t.account.mouqaddam}
                emptyLabel={t.account.chooseMouqaddam}
                details={personDetails(persons)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button className="button">{t.account.save}</button>
              {profile && (
                <Link href={`/silsila/${profile.id}`} className="profile-link mt-0">
                  {t.account.viewChain}
                  <Icon name="arrowR" size={16} />
                </Link>
              )}
            </div>
          </form>
        </section>

        <section className="panel self-start">
          <h2>{t.account.preferences}</h2>
          <div className="mt-4 space-y-5">
            <div>
              <span className="field-label">{t.account.theme}</span>
              <ThemePreference initial={theme} />
            </div>
            <div>
              <span className="field-label">{t.account.language}</span>
              <Segmented
                name="language"
                label={t.account.language}
                defaultValue="fr"
                disabled
                options={[
                  { value: "fr", label: t.account.languageFrench },
                  { value: "ar", label: <span lang="ar" className="saw">{t.account.languageArabic}</span> },
                ]}
              />
              <p className="field-help">{t.account.languageSoon}</p>
            </div>
          </div>
        </section>
      </div>

      {!session.local && (
        <section className="panel mt-6 max-w-2xl">
          <h2>{t.account.missingTitle}</h2>
          <p className="mt-1 text-muted">{t.account.missingText}</p>
          <form action={requestMouqaddam} className="mt-4 space-y-4">
            <label className="block">
              <span className="field-label">{t.account.missingName}</span>
              <input name="name" required minLength={2} maxLength={120} className="field" />
            </label>
            <label className="block">
              <span className="field-label">{t.account.city}</span>
              <input name="city" maxLength={120} className="field" />
            </label>
            <label className="block">
              <span className="field-label">{t.account.missingNote}</span>
              <textarea name="note" rows={2} maxLength={1000} className="field" />
            </label>
            <button className="button-quiet">{t.account.missingSend}</button>
          </form>
        </section>
      )}
    </div>
  );
}
