import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContributionWizard } from "@/components/ContributionWizard";
import type { ContributionKind } from "@/lib/contributions";
import { getStore } from "@/lib/data";
import { personDetails } from "@/lib/personDetails";
import { t } from "@/messages/fr";

const KINDS: Record<string, ContributionKind> = {
  mouqaddam: "mouqaddam",
  biographie: "biography",
  correction: "correction",
};

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const kind = KINDS[(await params).type];
  return { title: kind ? t.contribute.kinds[kind].title : t.contribute.eyebrow };
}

export default async function ContributeKindPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ personne?: string }>;
}) {
  const [{ type }, { personne }] = await Promise.all([params, searchParams]);
  const kind = KINDS[type];
  if (!kind) notFound();
  const persons = await getStore().listPersons();

  return (
    <div className="contrib-page">
      <header className="contrib-head contrib-head-small">
        <p className="eyebrow">{t.contribute.eyebrow}</p>
        <h1>{t.contribute.kinds[kind].title}</h1>
      </header>
      <ContributionWizard kind={kind} persons={persons} details={personDetails(persons)} initialPersonId={personne} />
    </div>
  );
}
