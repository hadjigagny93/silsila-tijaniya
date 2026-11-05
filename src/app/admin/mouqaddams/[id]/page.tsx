import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MouqaddamForm } from "@/components/MouqaddamForm";
import { Notice } from "@/components/Notice";
import { chainOf, childrenOf, isChoosableMouqaddam } from "@/lib/chain";
import { listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import { personDetails } from "@/lib/personDetails";
import { placementsFor } from "@/lib/placements";
import { t } from "@/messages/fr";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; ok?: string; cree?: string }>;
};

export const metadata: Metadata = { title: t.admin.edit };

export default async function EditMouqaddamPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { erreur, ok, cree } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  if (!session.isAdmin) redirect("/");

  const [persons, biographies] = await Promise.all([store.listPersons(), store.listBiographies()]);
  const person = persons.find((candidate) => candidate.id === id);
  if (!person || !isChoosableMouqaddam(person)) notFound();

  const prophet = persons.find((candidate) => candidate.kind === "prophet");
  const known = persons
    .filter(isChoosableMouqaddam)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  // Ni soi-même ni ses propres disciples : la chaîne formerait une boucle.
  const parents = (prophet ? [prophet] : [])
    .concat(known)
    .filter((candidate) => !chainOf(persons, candidate.id).chain.some((link) => link.id === id));

  return (
    <MouqaddamForm
      person={person}
      parents={parents}
      biographies={biographies}
      details={personDetails(persons)}
      placements={placementsFor(persons, parents)}
      covers={listCovers()}
      disciples={childrenOf(persons).get(id)?.length ?? 0}
      isRoot={Boolean(prophet) && person.mouqaddamId === prophet?.id}
    >
      {cree && <Notice tone="success">{t.admin.created}</Notice>}
      {ok && <Notice tone="success">{t.admin.done}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}
    </MouqaddamForm>
  );
}
