import { chainOf, generationsOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";

// Pour chaque maître possible : génération et maillons de celui qui recevra de lui.
export function placementsFor(persons: PublicPerson[], parents: PublicPerson[]) {
  const generations = generationsOf(persons);
  const prophet = persons.find((person) => person.kind === "prophet");
  return Object.fromEntries(
    parents.map((parent) => {
      const { chain, complete } = chainOf(persons, parent.id);
      const rank = generations.get(parent.id);
      // Les héritiers directs du Cheikh forment la 1re génération.
      const founder = parent.mouqaddamId !== null && parent.mouqaddamId === prophet?.id;
      const generation = rank ? rank + 1 : founder ? 1 : null;
      return [parent.id, { generation, links: complete ? chain.length : null }];
    }),
  );
}
