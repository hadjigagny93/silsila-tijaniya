import { childrenOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";

// Une carte par personne : photo ou initiales en haut, nom en dessous.
export const SQUARE = 84;
export const CARD_HEIGHT = 100;
// Épaisseur de la ligne de base, et hauteur des petits traits qui la relient à celui
// qui transmet, en dessous, et à ceux qui reçoivent, au-dessus.
export const SHELF = 1.5;
export const LINK = 12;
const GAP = 12;
const STEP = CARD_HEIGHT + SHELF + LINK * 2;
// Espace entre le socle du Prophète ﷺ et les chaînes à compléter.
const STRIP_GAP = 76;

export type PyramidCell = {
  person: PublicPerson;
  parent: PyramidCell | null;
  children: PyramidCell[];
  // Position relative au parent pendant le calcul, en carrés.
  offset: number;
  row: number;
  left: number;
  top: number;
  connected: boolean;
};

export type PyramidShelf = { owner: PyramidCell; left: number; top: number; width: number };
export type PyramidLink = { owner: PyramidCell; left: number; top: number };

type Contour = { left: number[]; right: number[] };

function build(
  person: PublicPerson,
  parent: PyramidCell | null,
  tree: Map<string, PublicPerson[]>,
  connected: boolean,
): PyramidCell {
  const cell: PyramidCell = {
    person,
    parent,
    children: [],
    offset: 0,
    row: parent ? parent.row + 1 : 0,
    left: 0,
    top: 0,
    connected,
  };
  cell.children = (tree.get(person.id) ?? []).map((child) => build(child, cell, tree, connected));
  return cell;
}

function spreadOf(cell: PyramidCell): number {
  return cell.children.reduce((total, child) => total + spreadOf(child), 1);
}

// Les branches les plus fournies au milieu : la pyramide reste équilibrée.
function balance(cells: PyramidCell[]) {
  const sorted = [...cells].sort((a, b) => spreadOf(b) - spreadOf(a));
  const balanced: PyramidCell[] = [];
  sorted.forEach((cell, index) => {
    if (index % 2 === 0) balanced.push(cell);
    else balanced.unshift(cell);
  });
  return balanced;
}

// Pose des blocs côte à côte en les serrant rangée par rangée : un bloc bas peut se
// glisser sous le débord d'un voisin plus haut, sans jamais empiéter sur lui.
function packSide(cells: PyramidCell[], contours: Contour[]) {
  const merged: Contour = { left: [], right: [] };
  cells.forEach((cell, index) => {
    const contour = contours[index];
    let shift = 0;
    if (index > 0) {
      const shared = Math.min(merged.right.length, contour.left.length);
      for (let row = 0; row < shared; row++) {
        shift = Math.max(shift, merged.right[row] - contour.left[row]);
      }
      shift += GAP / SQUARE;
    }
    cell.offset = shift;
    contour.left.forEach((edge, row) => {
      merged.left[row] = Math.min(merged.left[row] ?? Infinity, edge + shift);
      merged.right[row] = Math.max(merged.right[row] ?? -Infinity, contour.right[row] + shift);
    });
  });
  return merged;
}

function pack(cell: PyramidCell): Contour {
  cell.children = balance(cell.children);
  if (cell.children.length === 0) return { left: [-0.5], right: [0.5] };

  const merged = packSide(cell.children, cell.children.map(pack));
  const middle = (cell.children[0].offset + cell.children.at(-1)!.offset) / 2;
  for (const child of cell.children) child.offset -= middle;
  return {
    left: [-0.5, ...merged.left.map((edge) => edge - middle)],
    right: [0.5, ...merged.right.map((edge) => edge - middle)],
  };
}

function flatten(cell: PyramidCell, cells: PyramidCell[] = []) {
  cells.push(cell);
  cell.children.forEach((child) => flatten(child, cells));
  return cells;
}

function settle(cell: PyramidCell, center: number, base: number) {
  cell.left = center * SQUARE;
  cell.top = base - cell.row * STEP;
  for (const child of cell.children) settle(child, center + child.offset, base);
}

export function layoutPyramid(persons: PublicPerson[]) {
  const tree = childrenOf(persons);
  const known = new Set(persons.map((person) => person.id));
  const prophet = persons.find((person) => person.kind === "prophet");
  const loose = persons
    .filter((person) => person.kind !== "prophet" && (!person.mouqaddamId || !known.has(person.mouqaddamId)))
    .map((person) => build(person, null, tree, false));

  const main = prophet ? build(prophet, null, tree, true) : null;
  if (main) {
    pack(main);
    settle(main, 0, 0);
  }

  const saplings = balance(loose);
  const contours = saplings.map(pack);
  const strip = packSide(saplings, contours);
  const stripRows = strip.left.length;
  const stripWidth = stripRows > 0 ? Math.max(...strip.right) + 0.5 : 0;
  const stripBase = stripRows * STEP + STRIP_GAP;
  for (const sapling of saplings) settle(sapling, sapling.offset - stripWidth / 2 + 0.5, stripBase);

  const cells = [...(main ? flatten(main) : []), ...saplings.flatMap((sapling) => flatten(sapling))];
  const shelves: PyramidShelf[] = [];
  const links: PyramidLink[] = [];
  for (const cell of cells) {
    if (cell.children.length === 0) continue;
    const centers = cell.children.map((child) => child.left);
    const left = Math.min(...centers);
    const top = cell.top - LINK - SHELF;
    // La ligne s'arrête à l'axe du premier et du dernier : un seul héritier, une seule droite.
    shelves.push({ owner: cell, left, top, width: Math.max(...centers) - left });
    links.push({ owner: cell, left: cell.left, top: cell.top - LINK });
    for (const child of cell.children) links.push({ owner: child, left: child.left, top: top - LINK });
  }

  // Ramène tout dans le repère positif de la page.
  const minX = Math.min(...cells.map((cell) => cell.left - SQUARE / 2), 0);
  const maxX = Math.max(...cells.map((cell) => cell.left + SQUARE / 2), 0);
  const minY = Math.min(...cells.map((cell) => cell.top), 0);
  const maxY = Math.max(...cells.map((cell) => cell.top + CARD_HEIGHT), CARD_HEIGHT);
  for (const cell of cells) {
    cell.left -= minX + SQUARE / 2;
    cell.top -= minY;
  }
  for (const line of [...shelves, ...links]) {
    line.left -= minX;
    line.top -= minY;
  }

  return {
    cells,
    shelves,
    links,
    width: maxX - minX,
    height: maxY - minY,
    // Place de la légende des chaînes à compléter, quand il y en a.
    stripTop: saplings.length > 0 ? CARD_HEIGHT - minY + STRIP_GAP / 2 - 11 : null,
  };
}
