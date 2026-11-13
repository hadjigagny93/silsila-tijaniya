import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MouqaddamForm } from "@/components/MouqaddamForm";
import { Notice } from "@/components/Notice";
import { isChoosableMouqaddam } from "@/lib/chain";
import { listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import { personDetails } from "@/lib/personDetails";
import { placementsFor } from "@/lib/placements";
import { placeChoices } from "@/lib/places";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.admin.addNew };

export default async function NewMouqaddamPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  if (!session.isAdmin) redirect("/");

  const [persons, biographies] = await Promise.all([store.listPersons(), store.listBiographies()]);
  const known = persons
    .filter(isChoosableMouqaddam)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const parents = persons.filter((person) => person.kind === "prophet").concat(known);

  return (
    <MouqaddamForm
      parents={parents}
      places={placeChoices(persons)}
      biographies={biographies}
      details={personDetails(persons)}
      placements={placementsFor(persons, parents)}
      wirdCandidates={parents}
      covers={listCovers()}
    >
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}
    </MouqaddamForm>
  );
}
