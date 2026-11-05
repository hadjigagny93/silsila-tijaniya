import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MouqaddamList } from "@/components/MouqaddamList";
import { isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { compareBirthYears } from "@/lib/dates";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.admin.addTitle };

export default async function AdminMouqaddamsPage({
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
  const known = persons
    .filter(isChoosableMouqaddam)
    .sort(
      (a, b) =>
        compareBirthYears(a.birthDate, b.birthDate) || a.displayName.localeCompare(b.displayName, "fr"),
    );

  return (
    <div className="year-rail-space">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>{t.admin.addTitle}</h1>
        <Link href="/admin/mouqaddams/nouveau" className="button">
          {t.admin.addNew}
        </Link>
      </div>
      {ok && <p role="status" className="mt-4 text-accent">{t.admin.done}</p>}
      {erreur && <p role="alert" className="mt-4 text-gold">{t.errors.invalid}</p>}

      <MouqaddamList persons={known} />
    </div>
  );
}
