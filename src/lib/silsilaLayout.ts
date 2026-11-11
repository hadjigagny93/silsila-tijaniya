import { QuadraticBezierCurve3, Vector3 } from "three";
import { childrenOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";

export type TreeNode = {
  person: PublicPerson;
  parent: TreeNode | null;
  children: TreeNode[];
  depth: number;
  // Nombre de personnes portées par cette branche, elle-même comprise.
  weight: number;
  radius: number;
  position: Vector3;
  direction: Vector3;
  curve: QuadraticBezierCurve3 | null;
  // Faux pour les chaînes pas encore reliées au Prophète ﷺ.
  connected: boolean;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Position stable d'un chargement à l'autre : l'arbre garde sa forme.
function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function grow(
  person: PublicPerson,
  parent: TreeNode | null,
  tree: Map<string, PublicPerson[]>,
  connected: boolean,
): TreeNode {
  const node: TreeNode = {
    person,
    parent,
    children: [],
    depth: parent ? parent.depth + 1 : 0,
    weight: 1,
    radius: 0,
    position: new Vector3(),
    direction: new Vector3(0, 1, 0),
    curve: null,
    connected,
  };
  node.children = (tree.get(person.id) ?? []).map((child) => grow(child, node, tree, connected));
  node.weight += node.children.reduce((total, child) => total + child.weight, 0);
  node.children.sort((a, b) => b.weight - a.weight);
  node.radius = Math.min(0.05 + 0.1 * node.weight ** 0.42, 1.1);
  return node;
}

function place(node: TreeNode) {
  const count = node.children.length;
  if (count === 0) return;

  const axis = Math.abs(node.direction.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const u = new Vector3().crossVectors(node.direction, axis).normalize();
  const v = new Vector3().crossVectors(node.direction, u).normalize();
  const offset = hash(node.person.id) * Math.PI * 2;
  const spread = Math.min(0.95 + 0.14 * Math.log2(count), 1.45);

  // Répartition de Fibonacci : les enfants restent bien espacés, même par centaines.
  node.children.forEach((child, index) => {
    const seed = hash(child.person.id);
    const leaf = child.children.length === 0;
    const length = leaf
      ? 17 + seed * 7
      : Math.min(2.8 + 0.9 * Math.log2(1 + child.weight), 7.5) * (0.9 + seed * 0.25);

    child.direction.copy(node.direction);
    if (count === 1) {
      // Une lignée sans embranchement ondule au lieu de filer tout droit.
      const side = node.depth % 2 === 0 ? 1 : -1;
      child.direction.y += 0.9;
      child.direction.x += Math.cos(offset) * 0.3 * side;
      child.direction.z += Math.sin(offset) * 0.3 * side;
    } else {
      const tilt = spread * Math.sqrt((index + 0.5) / count);
      const azimuth = offset + index * GOLDEN_ANGLE;
      child.direction
        .multiplyScalar(Math.cos(tilt))
        .addScaledVector(u, Math.cos(azimuth) * Math.sin(tilt))
        .addScaledVector(v, Math.sin(azimuth) * Math.sin(tilt));
      // Les rameaux terminaux montent davantage : la ramure forme un dôme, pas un plateau.
      child.direction.y += leaf ? 0.45 : 0.16;
    }
    child.direction.normalize();

    child.position.copy(node.position).addScaledVector(child.direction, length);
    const control = node.position.clone().addScaledVector(node.direction, length * 0.5);
    child.curve = new QuadraticBezierCurve3(node.position.clone(), control, child.position.clone());
    // L'enfant repart dans l'axe où la courbe arrive : pas de cassure aux jonctions.
    child.direction.subVectors(child.position, control).normalize();
    place(child);
  });
}

function flatten(node: TreeNode, nodes: TreeNode[] = []) {
  nodes.push(node);
  node.children.forEach((child) => flatten(child, nodes));
  return nodes;
}

export function layoutForest(persons: PublicPerson[]) {
  const tree = childrenOf(persons);
  const known = new Set(persons.map((person) => person.id));
  const prophet = persons.find((person) => person.kind === "prophet");
  const saplings = persons.filter(
    (person) => person.kind !== "prophet" && (!person.mouqaddamId || !known.has(person.mouqaddamId)),
  );

  const main = prophet ? grow(prophet, null, tree, true) : null;
  if (main) place(main);
  const nodes = main ? flatten(main) : [];
  const reach = nodes.reduce(
    (largest, node) => Math.max(largest, Math.hypot(node.position.x, node.position.z)),
    4,
  );

  // Les chaînes à compléter poussent à part, sous la ramure : elles ne touchent
  // pas l'arbre tant qu'un admin ne les a pas reliées.
  const ring = Math.max(reach * 0.72, 7);
  saplings.forEach((person, index) => {
    const sapling = grow(person, null, tree, false);
    const angle = (index / saplings.length) * Math.PI * 2 + 0.6;
    sapling.position.set(Math.cos(angle) * ring, 0, Math.sin(angle) * ring);
    place(sapling);
    nodes.push(...flatten(sapling));
  });

  return nodes.sort((a, b) => a.depth - b.depth);
}
