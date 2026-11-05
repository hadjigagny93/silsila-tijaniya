import { Euler, Quaternion, Vector3 } from "three";
import { childrenOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";

export type OrbitShell = {
  radius: number;
  tilt: Quaternion;
};

// Chaque astre gravite autour de celui qui lui a transmis le wird,
// et devient lui-même le centre de ceux qui ont reçu de lui.
export type OrbitNode = {
  person: PublicPerson;
  parent: OrbitNode | null;
  children: OrbitNode[];
  depth: number;
  weight: number;
  // Rayon de l'astre, et rayon de tout le système qu'il entraîne.
  body: number;
  extent: number;
  shells: OrbitShell[];
  shell: number;
  phase: number;
  speed: number;
  position: Vector3;
  anchor: Vector3;
  connected: boolean;
};

const GAP = 1;

// Tous les astres ont la même taille : c'est leur luminosité qui les distingue.
export const BODY = 0.38;

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function grow(
  person: PublicPerson,
  parent: OrbitNode | null,
  tree: Map<string, PublicPerson[]>,
  connected: boolean,
): OrbitNode {
  const node: OrbitNode = {
    person,
    parent,
    children: [],
    depth: parent ? parent.depth + 1 : 0,
    weight: 1,
    body: 0,
    extent: 0,
    shells: [],
    shell: 0,
    phase: 0,
    speed: 0,
    position: new Vector3(),
    anchor: new Vector3(),
    connected,
  };
  node.children = (tree.get(person.id) ?? []).map((child) => grow(child, node, tree, connected));
  node.weight += node.children.reduce((total, child) => total + child.weight, 0);
  node.body = BODY;
  arrange(node);
  return node;
}

// Les enfants se rangent par anneaux : quand un anneau est plein, le suivant
// s'ouvre plus loin. Un mouqaddam peut ainsi porter des centaines de disciples.
function arrange(node: OrbitNode) {
  node.extent = node.body;
  if (node.children.length === 0) return;

  node.children.sort((a, b) => b.extent - a.extent);
  // Un disciple unique reste proche : son système entoure alors celui qui l'a formé.
  const alone = node.children.length === 1;
  let radius = node.body * 1.5 + (alone ? node.children[0].body : node.children[0].extent) + GAP;
  let ring: OrbitNode[] = [];
  let used = 0;

  const close = () => {
    const seed = hash(node.person.id + node.shells.length);
    const lean = node.depth === 0 ? 0.08 : 0.38;
    const tilt = new Quaternion().setFromEuler(
      new Euler((seed - 0.5) * 2 * lean, 0, (hash(String(seed)) - 0.5) * 2 * lean),
    );
    ring.forEach((child, index) => {
      child.shell = node.shells.length;
      child.phase = seed * Math.PI * 2 + (index / ring.length) * Math.PI * 2;
      child.speed = 0.7 / radius ** 0.7;
    });
    node.shells.push({ radius, tilt });
    node.extent = Math.max(node.extent, radius + ring[0].extent);
  };

  for (const child of node.children) {
    const arc = (child.extent * 2 + GAP) / radius;
    if (ring.length > 0 && used + arc > Math.PI * 2) {
      close();
      radius += ring[0].extent + child.extent + GAP;
      ring = [];
      used = 0;
    }
    ring.push(child);
    used += (child.extent * 2 + GAP) / radius;
  }
  close();
}

function flatten(node: OrbitNode, nodes: OrbitNode[] = []) {
  nodes.push(node);
  node.children.forEach((child) => flatten(child, nodes));
  return nodes;
}

export function layoutOrbits(persons: PublicPerson[]) {
  const tree = childrenOf(persons);
  const prophet = persons.find((person) => person.kind === "prophet");
  const known = new Set(persons.map((person) => person.id));
  const centers = persons.filter(
    (person) =>
      person.kind !== "prophet" &&
      (!person.mouqaddamId || person.mouqaddamId === prophet?.id || !known.has(person.mouqaddamId)),
  );

  const systems = centers
    .map((person) => grow(person, null, tree, person.mouqaddamId === prophet?.id))
    .sort((a, b) => Number(b.connected) - Number(a.connected) || b.weight - a.weight);
  const [main, ...others] = systems;

  // Un système sans lien connu reste à l'écart, sans orbite autour du centre.
  others.forEach((system, index) => {
    const angle = (index / others.length) * Math.PI * 2 + 0.6;
    const distance = main.extent + system.extent + main.body * 0.5;
    system.anchor.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
  });

  return { main, nodes: systems.flatMap((system) => flatten(system)) };
}

const offset = new Vector3();

// Les parents précèdent toujours leurs enfants dans `nodes`.
export function moveOrbits(nodes: OrbitNode[], time: number, spread: number) {
  for (const node of nodes) {
    if (!node.parent) {
      node.position.copy(node.anchor);
      continue;
    }
    const shell = node.parent.shells[node.shell];
    const angle = node.phase + time * node.speed;
    offset
      .set(Math.cos(angle), 0, Math.sin(angle))
      .multiplyScalar(shell.radius * spread)
      .applyQuaternion(shell.tilt);
    node.position.copy(node.parent.position).add(offset);
  }
}
