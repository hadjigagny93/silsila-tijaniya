import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { type BiographyEntry, BiographyIndex } from "@/components/BiographyIndex";
import { Icon } from "@/components/Icon";
import { biographySections, placeLabel } from "@/lib/biographySections";
import { coverStyle, listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.biographies.title };

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default async function BiographiesPage() {
  const store = getStore();
  const [biographies, persons, session] = await Promise.all([
    store.listBiographies(),
    store.listPersons(),
    store.getSession(),
  ]);
  const owners = new Map(persons.map((person) => [person.biographySlug, person]));
  const sections = biographySections(biographies, persons);
  const covers = listCovers();

  const entryOf = (biography: Biography): BiographyEntry => {
    const person: PublicPerson | null = owners.get(biography.slug) ?? null;
    const place = person
      ? person.city || placeLabel(person.deathCity, person.deathCountry) || placeLabel(person.birthCity, person.birthCountry)
      : "";
    return {
      slug: biography.slug,
      href: `/biographies/${biography.slug}`,
      name: biography.name,
      summary: biography.summary,
      period: person ? periodOf(person.birthDate, person.deathDate) : "",
      place,
      badges: [
        session?.isAdmin && biography.draft ? t.biographies.draftLabel : "",
        session?.local && biography.localOnly ? t.biographies.localOnlyBadge : "",
      ].filter(Boolean),
      person,
      haystack: normalize(
        [biography.name, ...(person?.nicknames ?? []), place, person?.zawiya ?? "", biography.summary].join(" "),
      ),
    };
  };

  // Le Cheikh (et le Prophète ﷺ s'il a sa page) ouvrent la bibliothèque en grand.
  const origins = sections.find((section) => section.id === "origines");
  const featured = origins?.biographies ?? [];

  return (
    <div className="bio-library">
      <header className="bio-library-head">
        <div>
          <p className="eyebrow">{t.biographies.eyebrow}</p>
          <h1>{t.biographies.title}</h1>
          <p className="bio-library-intro">{t.biographies.intro}</p>
          {biographies.length > 0 && (
            <p className="bio-library-count">{t.biographies.count(biographies.length, sections.length)}</p>
          )}
        </div>
        {session?.isAdmin && (
          <Link href="/biographies/nouvelle" className="button">
            <Icon name="plus" size={16} />
            {t.biographies.add}
          </Link>
        )}
      </header>

      {biographies.length === 0 && <p className="mt-8 text-muted">{t.biographies.empty}</p>}

      {featured.map((biography) => {
        const entry = entryOf(biography);
        return (
          <Link key={biography.slug} href={`/biographies/${biography.slug}`} className="bio-feature">
            <span className="bio-feature-image" style={coverStyle(biography, covers)} aria-hidden />
            <span className="bio-feature-text">
              <span className="eyebrow">{t.biographies.origins}</span>
              <span className="bio-feature-who">
                {entry.person && <Avatar person={entry.person} size={72} />}
                <span className="bio-feature-name">{biography.name}</span>
              </span>
              {(entry.period || entry.place) && (
                <span className="bio-feature-meta">{[entry.period, entry.place].filter(Boolean).join(" · ")}</span>
              )}
              {biography.summary && <span className="bio-feature-summary">{biography.summary}</span>}
              <span className="bio-feature-cta">
                {t.biographies.read}
                <Icon name="arrowR" size={16} />
              </span>
            </span>
          </Link>
        );
      })}

      {biographies.length > 0 && (
        <BiographyIndex
          sections={sections.map((section) => ({
            id: section.id,
            title: section.title,
            entries: section.biographies.map(entryOf),
          }))}
          hidden={featured.length ? ["origines"] : []}
        />
      )}
    </div>
  );
}
