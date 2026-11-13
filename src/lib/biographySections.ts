import { generationsOf } from "@/lib/chain";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { compareBirthYears } from "@/lib/dates";
import { t } from "@/messages/fr";

export type BiographySection = { id: string; title: string; biographies: Biography[] };

// Le Prophète ﷺ et le Cheikh ouvrent la liste ; ce qui n'est pas relié la ferme. Dans chaque partie, du plus
// ancien au plus récent. La page d'une biographie suit le même ordre pour « précédente » et « suivante ».
export function biographySections(biographies: Biography[], persons: PublicPerson[]): BiographySection[] {
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
    [...list].sort((a, b) => compareBirthYears(birthOf(a), birthOf(b)) || a.name.localeCompare(b.name, "fr"));

  const sections: BiographySection[] = [
    { id: "origines", title: t.biographies.origins, biographies: inOrder(origins) },
    ...[...ranked.keys()]
      .sort((a, b) => a - b)
      .map((rank) => ({
        id: `generation-${rank}`,
        title: t.biographies.generation(rank),
        biographies: inOrder(ranked.get(rank)!),
      })),
    { id: "a-preciser", title: t.biographies.noGeneration, biographies: inOrder(pending) },
  ];
  return sections.filter((section) => section.biographies.length > 0);
}

// « Fès, Maroc » : la ville et le pays connus.
export function placeLabel(city: string | null, country: string | null) {
  return [city, country].filter(Boolean).join(", ");
}

// Environ 200 mots par minute, jamais moins d'une minute.
export function readingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Le lieu d'une personne : sa ville, sinon celui de son décès, sinon celui de sa naissance.
export function placeOfPerson(person: PublicPerson) {
  return (
    person.city ||
    placeLabel(person.deathCity, person.deathCountry) ||
    placeLabel(person.birthCity, person.birthCountry)
  );
}

// Ce que voit un visiteur : jamais le rang de pôle spirituel, gardé pour l'admin.
export function publicPerson(person: PublicPerson): PublicPerson {
  return { ...person, qutb: false };
}
