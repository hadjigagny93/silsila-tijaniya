import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { closeReport, hideReportedPerson, resolveRequest } from "@/app/actions";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.admin.title };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  const store = getStore();
  const session = await store.getSession();
  if (!session) redirect("/connexion");
  if (!session.isAdmin) redirect("/");
  // Avec un seul utilisateur, il n'y a ni demande ni signalement à traiter.
  if (session.local) redirect("/admin/mouqaddams");

  const [requests, reports] = await Promise.all([store.listRequests(), store.listReports()]);

  return (
    <>
      <h1>{t.admin.title}</h1>
      {ok && <p role="status" className="mt-4 text-accent">{t.admin.done}</p>}
      {erreur && <p role="alert" className="mt-4 text-gold">{t.errors.invalid}</p>}

      <section className="mt-8">
        <h2>{t.admin.requests}</h2>
        {requests.length === 0 && <p className="mt-2 text-muted">{t.admin.noRequests}</p>}
        <ul className="mt-3 space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-md border border-line bg-surface p-4">
              <p className="font-semibold">
                {request.name}
                {request.city ? ` (${request.city})` : ""}
              </p>
              {request.note && <p className="mt-1 text-muted">{request.note}</p>}
              <form action={resolveRequest} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={request.id} />
                <button name="status" value="accepted" className="button-quiet">{t.admin.accept}</button>
                <button name="status" value="rejected" className="button-quiet">{t.admin.reject}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2>{t.admin.reports}</h2>
        {reports.length === 0 && <p className="mt-2 text-muted">{t.admin.noReports}</p>}
        <ul className="mt-3 space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="rounded-md border border-line bg-surface p-4">
              <Link href={`/silsila/${report.personId}`} className="font-semibold text-accent underline">
                {report.personName}
              </Link>
              <p className="mt-1">{report.reason}</p>
              <form className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="personId" value={report.personId} />
                <button formAction={closeReport} className="button-quiet">{t.admin.close}</button>
                <button formAction={hideReportedPerson} className="button-quiet">{t.admin.hide}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
