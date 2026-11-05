import type { PublicPerson } from "@/lib/data/types";

// Remonte de la personne vers le Prophète ﷺ. La chaîne est rendue du haut vers
// le bas ; elle est incomplète si la remontée s'arrête avant le Prophète.
export function chainOf(persons: PublicPerson[], id: string) {
  const byId = new Map(persons.map((person) => [person.id, person]));
  const chain: PublicPerson[] = [];
  const seen = new Set<string>();

  for (let person = byId.get(id); person && !seen.has(person.id); person = byId.get(person.mouqaddamId ?? "")) {
    seen.add(person.id);
    chain.unshift(person);
  }

  return { chain, complete: chain[0]?.kind === "prophet" };
}

export function childrenOf(persons: PublicPerson[]) {
  const children = new Map<string, PublicPerson[]>();
  for (const person of persons) {
    if (!person.mouqaddamId) continue;
    children.set(person.mouqaddamId, [...(children.get(person.mouqaddamId) ?? []), person]);
  }
  return children;
}

export function isChoosableMouqaddam(person: PublicPerson) {
  return person.kind === "cheikh" || person.kind === "mouqaddam";
}

// Génération 1 : ceux qui ont pris de Cheikh Tijani ; 2 : ceux qui ont pris d'eux ; etc.
// Le Prophète ﷺ, le Cheikh et les chaînes non reliées n'en ont pas.
export function generationsOf(persons: PublicPerson[]) {
  const tree = childrenOf(persons);
  const generations = new Map<string, number>();
  const prophet = persons.find((person) => person.kind === "prophet");

  function descend(person: PublicPerson, generation: number) {
    if (generations.has(person.id)) return;
    generations.set(person.id, generation);
    (tree.get(person.id) ?? []).forEach((child) => descend(child, generation + 1));
  }

  if (prophet) {
    for (const founder of tree.get(prophet.id) ?? []) {
      (tree.get(founder.id) ?? []).forEach((child) => descend(child, 1));
    }
  }
  return generations;
}
