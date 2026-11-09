import { childrenOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";

// Arbre des chaînes reliées au Prophète ﷺ : profondeur 0 pour le Cheikh, puis une par génération.
// Les chaînes à compléter (sans maître, ou dont le maître n'existe plus) forment des petits groupes à part,
// leur premier maillon à la profondeur 1.
export type ForestNode = {
  person: PublicPerson;
  parent: ForestNode | null;
  children: ForestNode[];
  depth: number;
  // Nombre de personnes qui descendent de lui.
  desc: number;
  x: number;
  y: number;
  // Chaîne qui ne remonte pas (encore) au Prophète ﷺ : dessinée à part, en bas de l'arbre.
  stray?: boolean;
};

// Position stable d'un chargement à l'autre.
export function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return (value >>> 0) / 4294967295;
}

export function buildForest(persons: PublicPerson[]) {
  const tree = childrenOf(persons);
  const prophet = persons.find((person) => person.kind === "prophet");
  if (!prophet) return null;

  function grow(person: PublicPerson, parent: ForestNode | null, depth: number): ForestNode {
    const node: ForestNode = { person, parent, children: [], depth, desc: 0, x: 0, y: 0 };
    node.children = (tree.get(person.id) ?? []).map((child) => grow(child, node, depth + 1));
    node.desc = node.children.reduce((total, child) => total + 1 + child.desc, 0);
    // Les branches les plus fournies au milieu : l'arbre reste équilibré.
    const sorted = [...node.children].sort((a, b) => b.desc - a.desc);
    node.children = [];
    sorted.forEach((child, index) => (index % 2 ? node.children.unshift(child) : node.children.push(child)));
    return node;
  }

  const root = grow(prophet, null, -1);
  const nodes: ForestNode[] = [];
  const walk = (node: ForestNode) => {
    nodes.push(node);
    node.children.forEach(walk);
  };
  walk(root);

  const known = new Set(persons.map((person) => person.id));
  const strays = persons
    .filter(
      (person) =>
        person.kind !== "prophet" &&
        person.kind !== "member" &&
        (!person.mouqaddamId || !known.has(person.mouqaddamId)),
    )
    .map((person) => grow(person, null, 1))
    .sort((a, b) => b.desc - a.desc || a.person.displayName.localeCompare(b.person.displayName));
  const mark = (node: ForestNode) => {
    node.stray = true;
    nodes.push(node);
    node.children.forEach(mark);
  };
  strays.forEach(mark);
  return { root, nodes, strays, byId: new Map(nodes.map((node) => [node.person.id, node])) };
}

export function chainTo(node: ForestNode) {
  const chain = new Set<ForestNode>();
  for (let cursor: ForestNode | null = node; cursor; cursor = cursor.parent) chain.add(cursor);
  return chain;
}

export function subtreeOf(node: ForestNode, found = new Set<ForestNode>()) {
  found.add(node);
  node.children.forEach((child) => subtreeOf(child, found));
  return found;
}
