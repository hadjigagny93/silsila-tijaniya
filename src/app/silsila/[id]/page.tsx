import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { reportPerson } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { chainOf } from "@/lib/chain";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const persons = await getStore().listPersons();
  return { title: persons.find((person) => person.id === id)?.displayName };
}

export default async function PersonPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const store = getStore();
  const [persons, session] = await Promise.all([store.listPersons(), store.getSession()]);
  const { chain, complete } = chainOf(persons, id);
  const person = chain.at(-1);
  if (!person) notFound();

  const born = [person.birthDate, person.birthCity, person.birthCountry].filter(Boolean).join(", ");
  const died = [person.deathDate, person.deathCity, person.deathCountry].filter(Boolean).join(", ");
  const facts = [
    [t.silsila.nicknames, person.nicknames.join(", ")],
    [t.silsila.born, born],
    [t.silsila.died, died],
    [t.silsila.zawiya, person.zawiya],
  ].filter(([, value]) => value);

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar person={person} size={72} />
        <h1>{person.displayName}</h1>
      </div>
      <p className="mt-1 text-muted">
        {[t.kinds[person.kind], person.kind === "member" && person.city]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4">
        <Link href={`/silsila?personne=${person.id}`} className="text-accent underline">
          {t.silsila.viewInTree}
        </Link>
        {person.biographySlug && (
          <Link href={`/biographies/${person.biographySlug}`} className="text-accent underline">
            {t.silsila.biography}
          </Link>
        )}
      </p>

      {facts.length > 0 && (
        <dl className="mt-4 grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {facts.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-muted">{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}

      {!complete && (
        <p className="mt-6 rounded-md border border-gold/50 p-3 text-gold">{t.silsila.incomplete}</p>
      )}

      <ol className="mt-8">
        {chain.map((link, index) => (
          <li key={link.id} className="relative border-s border-line pb-6 ps-6 last:border-transparent">
            <span
              aria-hidden
              className={`absolute -start-1.5 top-1.5 size-3 rounded-full ${
                index === chain.length - 1 ? "bg-accent" : "bg-gold"
              }`}
            />
            <Link href={`/silsila/${link.id}`} className="flex items-center gap-2 font-semibold hover:underline">
              <Avatar person={link} />
              {link.displayName}
            </Link>
            {t.kinds[link.kind] && <span className="block text-sm text-muted">{t.kinds[link.kind]}</span>}
          </li>
        ))}
      </ol>

      {/* Signalement : seulement pour un compte du site (les comptes sont fermés pour le moment). */}
      {person.kind !== "prophet" && session && !session.local && (
        <section className="mt-8 border-t border-line pt-6">
          {ok && <p role="status" className="mb-3 text-accent">{t.silsila.reportSent}</p>}
          {erreur && <p role="alert" className="mb-3 text-gold">{t.errors.invalid}</p>}
          {session ? (
            <details>
              <summary className="cursor-pointer text-muted">{t.silsila.report}</summary>
              <form action={reportPerson} className="mt-3 max-w-lg space-y-3">
                <input type="hidden" name="personId" value={person.id} />
                <label className="block">
                  {t.silsila.reportLabel}
                  <textarea name="reason" required minLength={5} maxLength={1000} rows={3} className="field mt-1" />
                </label>
                <button className="button-quiet">{t.silsila.reportSend}</button>
              </form>
            </details>
          ) : (
            <Link href="/connexion" className="text-muted underline">
              {t.silsila.reportSignIn}
            </Link>
          )}
        </section>
      )}
    </>
  );
}
