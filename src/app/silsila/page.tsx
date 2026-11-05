import type { Metadata } from "next";
import Link from "next/link";
import { SilsilaTree } from "@/components/SilsilaTree";
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

export default async function SilsilaPage({ searchParams }: { searchParams: Promise<{ personne?: string; vue?: string }> }) {
  const { personne, vue } = await searchParams;
  const persons = await getStore().listPersons();
  const tree = childrenOf(persons);
  const known = new Set(persons.map((person) => person.id));

  const prophet = persons.find((person) => person.kind === "prophet");
  const orphans = persons.filter(
    (person) => person.kind !== "prophet" && (!person.mouqaddamId || !known.has(person.mouqaddamId)),
  );

  return (
    <>
      <SilsilaTree
        persons={persons}
        initialId={persons.some((person) => person.id === personne) ? personne : undefined}
        initialView={vue === "planetaire" ? "planets" : vue === "pyramide" ? "pyramid" : "tree"}
      />

      <details className="mt-10">
        <summary className="section-title cursor-pointer">{t.silsila.tree}</summary>
        {prophet && (
          <ul className="tree mt-3 text-lg">
            <Branch person={prophet} tree={tree} />
          </ul>
        )}

        {orphans.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl">{t.silsila.orphans}</h2>
            <p className="mt-1 text-muted">{t.silsila.orphansText}</p>
            <ul className="tree mt-3 text-lg">
              {orphans.map((person) => (
                <Branch key={person.id} person={person} tree={tree} />
              ))}
            </ul>
          </section>
        )}
      </details>
    </>
  );
}
