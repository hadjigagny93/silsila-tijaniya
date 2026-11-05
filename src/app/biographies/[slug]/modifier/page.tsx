import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BiographyForm } from "@/components/BiographyForm";
import { listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.biographies.edit };

export default async function EditBiographyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { slug } = await params;
  const { erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session?.isAdmin) redirect(`/biographies/${slug}`);

  const biography = await store.getBiography(slug);
  if (!biography) notFound();
  const persons = await store.listPersons();

  return (
    <BiographyForm
      covers={listCovers()}
      biography={biography}
      persons={persons}
      personId={persons.find((person) => person.biographySlug === slug)?.id}
      failed={Boolean(erreur)}
    />
  );
}
