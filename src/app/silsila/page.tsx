import type { Metadata } from "next";
import Link from "next/link";
import { childrenOf } from "@/lib/chain";
import { getStore } from "@/lib/data";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.silsila.title };

function Branch({ person, tree }: { person: PublicPerson; tree: Map<string, PublicPerson[]> }) {
  const descendants = tree.get(person.id) ?? [];

  return (
    <li>
      <Link href={`/silsila/${person.id}`} className="hover:text-accent hover:underline">
        {person.displayName}
      </Link>
      {descendants.length > 0 && (
        <ul>
          {descendants.map((child) => (
            <Branch key={child.id} person={child} tree={tree} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function SilsilaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const persons = await getStore().listPersons();
  const tree = childrenOf(persons);
  const known = new Set(persons.map((person) => person.id));

  const prophet = persons.find((person) => person.kind === "prophet");
  const orphans = persons.filter(
    (person) => person.kind !== "prophet" && (!person.mouqaddamId || !known.has(person.mouqaddamId)),
  );
  const matches = query
    ? persons.filter((person) => person.displayName.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{t.silsila.title}</h1>
          <p className="mt-2 text-muted">{t.silsila.intro}</p>
        </div>
        <Link href="/mon-compte" className="button">
          {t.silsila.add}
        </Link>
      </div>

      <form className="mt-8 flex max-w-md gap-2" role="search">
        <label className="sr-only" htmlFor="q">
          {t.silsila.searchLabel}
        </label>
        <input id="q" name="q" type="search" defaultValue={query} placeholder={t.silsila.searchLabel} className="field" />
        <button className="button-quiet">{t.silsila.search}</button>
      </form>

      {query && (
        <section className="mt-8">
          <h2 className="text-2xl">{t.silsila.results}</h2>
          {matches.length === 0 && <p className="mt-2 text-muted">{t.silsila.noResult}</p>}
          <ul className="mt-2 space-y-1">
            {matches.map((person) => (
              <li key={person.id}>
                <Link href={`/silsila/${person.id}`} className="text-accent hover:underline">
                  {person.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-2xl">{t.silsila.tree}</h2>
        {prophet && (
          <ul className="tree mt-3 text-lg">
            <Branch person={prophet} tree={tree} />
          </ul>
        )}
      </section>

      {orphans.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl">{t.silsila.orphans}</h2>
          <p className="mt-1 text-muted">{t.silsila.orphansText}</p>
          <ul className="tree mt-3 text-lg">
            {orphans.map((person) => (
              <Branch key={person.id} person={person} tree={tree} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
