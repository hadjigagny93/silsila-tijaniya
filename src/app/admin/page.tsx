import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addMouqaddam,
  closeReport,
  hideReportedPerson,
  linkMouqaddam,
  resolveRequest,
} from "@/app/actions";
import { isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.admin.title };

function MouqaddamOptions({ persons }: { persons: PublicPerson[] }) {
  return persons.map((person) => (
    <option key={person.id} value={person.id}>
      {person.displayName}
    </option>
  ));
}

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

  const [persons, requests, reports] = await Promise.all([
    store.listPersons(),
    store.listRequests(),
    store.listReports(),
  ]);
  const candidates = persons
    .filter(isChoosableMouqaddam)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const parents = persons.filter((person) => person.kind === "prophet").concat(candidates);
  const unlinked = candidates.filter((person) => !person.mouqaddamId);

  return (
    <>
      <h1 className="text-4xl">{t.admin.title}</h1>
      {ok && <p role="status" className="mt-4 text-accent">{t.admin.done}</p>}
      {erreur && <p role="alert" className="mt-4 text-gold">{t.errors.invalid}</p>}

      <section className="mt-8">
        <h2 className="text-2xl">{t.admin.requests}</h2>
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
        <h2 className="text-2xl">{t.admin.reports}</h2>
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

      <section className="mt-10 max-w-lg">
        <h2 className="text-2xl">{t.admin.addTitle}</h2>
        <form action={addMouqaddam} className="mt-3 space-y-3">
          <label className="block">
            {t.admin.name}
            <input name="name" required minLength={2} maxLength={120} className="field mt-1" />
          </label>
          <label className="block">
            {t.admin.city}
            <input name="city" maxLength={120} className="field mt-1" />
          </label>
          <label className="block">
            {t.admin.parent}
            <select name="mouqaddamId" className="field mt-1">
              <option value="">{t.admin.none}</option>
              <MouqaddamOptions persons={candidates} />
            </select>
          </label>
          <button className="button">{t.admin.add}</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">{t.admin.linksTitle}</h2>
        {unlinked.length === 0 && <p className="mt-2 text-muted">{t.admin.noLinks}</p>}
        <ul className="mt-3 space-y-3">
          {unlinked.map((person) => (
            <li key={person.id}>
              <form action={linkMouqaddam} className="flex max-w-xl flex-wrap items-center gap-2">
                <input type="hidden" name="personId" value={person.id} />
                <span className="min-w-48 flex-1">{person.displayName}</span>
                <select name="mouqaddamId" required aria-label={`${t.admin.parent} : ${person.displayName}`} className="field w-auto">
                  <option value="">{t.admin.none}</option>
                  <MouqaddamOptions persons={parents.filter((parent) => parent.id !== person.id)} />
                </select>
                <button className="button-quiet">{t.admin.link}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
