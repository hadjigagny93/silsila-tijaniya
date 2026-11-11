import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { generationsOf } from "@/lib/chain";
import { coverStyle, listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { compareBirthYears, periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.biographies.title };

type Section = { id: string; title: string; biographies: Biography[] };

// Le Prophète ﷺ et le Cheikh ouvrent la page ; ce qui n'est pas relié la ferme.
function sectionsOf(biographies: Biography[], persons: PublicPerson[]) {
  const generations = generationsOf(persons);
  const owners = new Map(persons.map((person) => [person.biographySlug, person]));
  const prophet = persons.find((person) => person.kind === "prophet");

  const origins: Biography[] = [];
  const pending: Biography[] = [];
  const ranked = new Map<number, Biography[]>();
  for (const biography of biographies) {
    const owner = owners.get(biography.slug);
    const rank = owner && generations.get(owner.id);
    if (rank) ranked.set(rank, [...(ranked.get(rank) ?? []), biography]);
    else if (owner && (owner.id === prophet?.id || owner.mouqaddamId === prophet?.id)) origins.push(biography);
    else pending.push(biography);
  }

  const birthOf = (biography: Biography) => owners.get(biography.slug)?.birthDate ?? null;
  const inOrder = (list: Biography[]) =>
    [...list].sort(
      (a, b) => compareBirthYears(birthOf(a), birthOf(b)) || a.name.localeCompare(b.name, "fr"),
    );

  const sections: Section[] = [
    { id: "origines", title: t.biographies.origins, biographies: inOrder(origins) },
    ...[...ranked.keys()].sort((a, b) => a - b).map((rank) => ({
      id: `generation-${rank}`,
      title: t.biographies.generation(rank),
      biographies: inOrder(ranked.get(rank)!),
    })),
    { id: "a-preciser", title: t.biographies.noGeneration, biographies: inOrder(pending) },
  ];
  return sections.filter((section) => section.biographies.length > 0);
}

export default async function BiographiesPage() {
  const store = getStore();
  const [biographies, persons, session] = await Promise.all([
    store.listBiographies(),
    store.listPersons(),
    store.getSession(),
  ]);
  const periods = new Map(
    persons.map((person) => [person.biographySlug, periodOf(person.birthDate, person.deathDate)]),
  );
  const owners = new Map(persons.map((person) => [person.biographySlug, person]));
  const sections = sectionsOf(biographies, persons);
  const covers = listCovers();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>{t.biographies.title}</h1>
          <p className="mt-2 text-muted">{t.biographies.intro}</p>
        </div>
        {session?.isAdmin && (
          <Link href="/biographies/nouvelle" className="button">
            {t.biographies.add}
          </Link>
        )}
      </div>

      {biographies.length === 0 && <p className="mt-8 text-muted">{t.biographies.empty}</p>}

      {sections.length > 1 && (
        <nav className="generation-nav" aria-label={t.biographies.sectionsLabel}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>
      )}

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="generation-section">
          <h2>
            {section.title} <span className="text-base font-normal text-muted">{section.biographies.length}</span>
          </h2>
          <ul className="bio-grid mt-5">
            {section.biographies.map((biography) => {
              const owner = owners.get(biography.slug);
              return (
                <li key={biography.slug}>
                  <Link href={`/biographies/${biography.slug}`} className="bio-tile">
                    <span className="bio-tile-image" style={coverStyle(biography, covers)} aria-hidden />
                    <span className="bio-tile-text">
                      {owner && <Avatar person={owner} size={48} />}
                      <span className="bio-tile-label">
                        {[periods.get(biography.slug), biography.draft && t.biographies.draftLabel]
                          .filter(Boolean)
                          .join(" · ") || t.home.biographiesLabel}
                      </span>
                      <span className="bio-tile-name">{biography.name}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
