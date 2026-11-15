import type { Metadata } from "next";
import { type BiographyEntry, BiographyIndex, type BiographyIndexSection } from "@/components/BiographyIndex";
import { placeImageUrl } from "@/components/Avatar";
import { placeOfPerson, publicPerson } from "@/lib/biographySections";
import { coverUrl, listCovers, shownCover } from "@/lib/covers";
import { generationsOf, isChoosableMouqaddam } from "@/lib/chain";
import { getStore } from "@/lib/data";
import type { PublicPerson } from "@/lib/data/types";
import { compareBirthYears, periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.mouqaddams.title };

const m = t.mouqaddams;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Annuaire public des cheikhs et mouqaddams, en lecture seule, rangé par génération comme les biographies.
export default async function MouqaddamsPage() {
  const store = getStore();
  const [persons, biographies] = await Promise.all([store.listPersons(), store.listBiographies()]);
  const covers = listCovers();
  const published = new Map(biographies.filter((entry) => entry.body.trim()).map((entry) => [entry.slug, entry]));
  // Sans image du lieu : la couverture que montre son profil.
  const backdropOf = (person: PublicPerson) => {
    if (person.placeImageVersion) return placeImageUrl(person);
    const biography = person.biographySlug ? published.get(person.biographySlug) : undefined;
    const cover = shownCover(biography ?? { slug: person.id, cover: null }, covers);
    return cover ? coverUrl(cover) : null;
  };
  const generations = generationsOf(persons);
  const prophet = persons.find((person) => person.kind === "prophet");
  const known = persons.filter(isChoosableMouqaddam);

  const entryOf = (person: PublicPerson): BiographyEntry => {
    const place = placeOfPerson(person);
    return {
      slug: person.id,
      href: `/mouqaddams/${person.id}`,
      name: person.displayName,
      summary: person.zawiya ?? "",
      period: periodOf(person.birthDate, person.deathDate),
      place,
      badges: [],
      person: publicPerson(person),
      backdrop: backdropOf(person),
      caption: person.placeImageVersion ? person.placeCaption : null,
      haystack: normalize([person.displayName, ...person.nicknames, place, person.zawiya ?? ""].join(" ")),
    };
  };
  const inOrder = (list: PublicPerson[]) =>
    [...list].sort(
      (a, b) => compareBirthYears(a.birthDate, b.birthDate) || a.displayName.localeCompare(b.displayName, "fr"),
    );

  const origins = known.filter((person) => !generations.get(person.id) && person.mouqaddamId === prophet?.id);
  const pending = known.filter((person) => !generations.get(person.id) && person.mouqaddamId !== prophet?.id);
  const ranks = [...new Set(known.map((person) => generations.get(person.id)).filter(Boolean) as number[])].sort(
    (a, b) => a - b,
  );
  const sections: BiographyIndexSection[] = [
    { id: "origines", title: t.biographies.origins, entries: inOrder(origins).map(entryOf) },
    ...ranks.map((rank) => ({
      id: `generation-${rank}`,
      title: m.generation(rank),
      entries: inOrder(known.filter((person) => generations.get(person.id) === rank)).map(entryOf),
    })),
    { id: "a-preciser", title: t.biographies.noGeneration, entries: inOrder(pending).map(entryOf) },
  ].filter((section) => section.entries.length > 0);

  return (
    <div className="bio-library">
      <header className="bio-library-head">
        <div>
          <p className="eyebrow">{m.eyebrow}</p>
          <h1>{m.title}</h1>
          <p className="bio-library-intro">{m.intro}</p>
          <p className="bio-library-count">{m.count(known.length)}</p>
        </div>
      </header>
      <BiographyIndex layout="scenes" sections={sections} placeholder={m.searchPlaceholder} searchLabel={m.searchLabel} />
    </div>
  );
}
