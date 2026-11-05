import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { linkMouqaddam } from "@/app/actions";
import { LinkComposer } from "@/components/LinkComposer";
import { Notice } from "@/components/Notice";
import { PendingRow } from "@/components/PendingRow";
import { childrenOf, isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { personDetails } from "@/lib/personDetails";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.admin.silsilaTitle };

export default async function AdminSilsilaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  if (!session.isAdmin) redirect("/");

  const persons = await store.listPersons();
  const candidates = persons
    .filter(isChoosableMouqaddam)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const parents = persons.filter((person) => person.kind === "prophet").concat(candidates);
  const unlinked = candidates.filter((person) => !person.mouqaddamId);
  const details = personDetails(persons);
  const tree = childrenOf(persons);

  return (
    <div className="max-w-5xl">
      <h1 className="page-title">{t.admin.silsilaTitle}</h1>
      <p className="page-intro">{t.admin.silsilaIntro}</p>
      {ok && <Notice tone="success">{t.admin.linked}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}

      <form key={ok} action={linkMouqaddam} className="mt-8">
        <LinkComposer persons={persons} candidates={candidates} parents={parents} details={details} />
      </form>

      <section className="mt-12">
        <h2 className="flex items-center gap-3 text-[30px]">
          {t.admin.linksTitle}
          <span className="count-badge">{unlinked.length}</span>
        </h2>
        {unlinked.length === 0 ? (
          <p className="mt-3 text-muted">{t.admin.noLinks}</p>
        ) : (
          <ul key={ok} className="pending-list">
            {unlinked.map((person) => (
              <PendingRow
                key={person.id}
                person={person}
                parents={parents.filter((parent) => parent.id !== person.id)}
                details={details}
                disciples={tree.get(person.id)?.length ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
