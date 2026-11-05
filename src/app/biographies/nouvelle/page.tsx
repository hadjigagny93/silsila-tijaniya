import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BiographyForm } from "@/components/BiographyForm";
import { listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.biographies.add };

export default async function NewBiographyPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session?.isAdmin) redirect("/biographies");

  return <BiographyForm persons={await store.listPersons()} covers={listCovers()} failed={Boolean(erreur)} />;
}
