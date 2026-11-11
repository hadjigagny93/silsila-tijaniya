import { generationsOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";

// Ligne d'accompagnement d'un nom dans les sélecteurs : « Cheikh · 1re gén. ».
export function personDetails(persons: PublicPerson[]) {
  const generations = generationsOf(persons);
  return Object.fromEntries(
    persons.map((person) => {
      const rank = generations.get(person.id);
      const parts = [t.kinds[person.kind], rank && t.silsila.generationShort(rank), person.birthCity];
      return [person.id, parts.filter(Boolean).join(" · ")];
    }),
  );
}
