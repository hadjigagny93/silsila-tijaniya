import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FocusCard } from "@/components/FocusCard";
import { Icon } from "@/components/Icon";
import { getStore } from "@/lib/data";
import { todayKey } from "@/lib/suluk";
import { loadSuluk } from "@/lib/sulukData";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.echiquier.focus };

// La station du mois, ouverte depuis son nom arabe dans « Prochaine œuvre ».
export default async function FocusPage() {
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  const { settings, groups } = await loadSuluk(session.userId);

  return (
    <div className="max-w-3xl">
      <Link href="/suluk" className="back-link">
        <Icon name="arrowL" />
        {t.abdal.back}
      </Link>
      <div className="mt-4">
        <FocusCard userId={session.userId} today={todayKey(settings.timezone)} groups={groups} />
      </div>
    </div>
  );
}
