import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdditionsList } from "@/components/AdditionsList";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.additions.title };

// Les derniers ajouts : de quoi suivre le travail des deux admins (le Mac et l'iPhone d'un côté, le site de l'autre).
const LIMIT = 300;

export default async function AdditionsPage() {
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/admin/connexion");
  if (!session.isAdmin) redirect("/");

  const [found, persons, mine] = await Promise.all([
    store.listAdditions(LIMIT).catch((error: unknown) => {
      console.error("Derniers ajouts :", error);
      return null;
    }),
    store.listPersons(),
    store.myAuthors(),
  ]);
  const missing = found === null;
  const additions = found ?? [];
  const byId = new Map(persons.map((person) => [person.id, person]));

  return (
    <div className="page-wide">
      <p className="eyebrow">{t.nav.admin}</p>
      <h1 className="mt-2">{t.additions.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.additions.lead}</p>
      {missing && (
        <p role="alert" className="mt-6 max-w-2xl text-gold">
          {t.additions.missing}
        </p>
      )}
      {!missing && (
        <AdditionsList
          additions={additions.map((addition) => ({
            ...addition,
            person: byId.get(addition.id) ?? null,
          }))}
          mine={mine}
          limit={LIMIT}
        />
      )}
    </div>
  );
}
