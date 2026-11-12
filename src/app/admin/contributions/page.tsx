import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContributionInbox } from "@/components/ContributionInbox";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.inbox.title };

export default async function ContributionsPage() {
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  if (!session.isAdmin) redirect("/");

  return (
    <div className="page-wide">
      <p className="eyebrow">{t.nav.admin}</p>
      <h1 className="mt-2">{t.inbox.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.inbox.lead}</p>
      <ContributionInbox persons={await store.listPersons()} />
    </div>
  );
}
