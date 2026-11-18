import type { PublicPerson } from "@/lib/data/types";

export type TreeDisplay = "photo" | "name";

// Pour la personne choisie : ses shouyoukhs (de qui elle a pris), ses disciples (qui ont pris d'elle), ou les deux.
export type Lineage = { masters: boolean; disciples: boolean };
export const DEFAULT_LINEAGE: Lineage = { masters: true, disciples: false };

export type SceneApi = {
  select(id: string | null): void;
  setDisplay?(display: TreeDisplay): void;
  setIsolated?(isolated: boolean): void;
  setGeneration?(generation: number | null): void;
  setLineage?(lineage: Lineage): void;
  // Propre à l'arbre vivant : la molette déplace le dessin, et la ramure se réorganise.
  setExploring?(exploring: boolean): void;
  rearrange?(): void;
  zoom(factor: number): void;
  // Recadre sur l'ensemble sans toucher à la sélection.
  overview(): void;
  reset(): void;
  dispose(): void;
};

export type SceneOptions = {
  container: HTMLElement;
  labels: HTMLElement;
  persons: PublicPerson[];
  display?: TreeDisplay;
  dark?: boolean;
  generation?: number | null;
  lineage?: Lineage;
  onSelect(id: string | null): void;
};

export function prefersCalm() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Couleur du contour de chaque personne, dans l'arbre comme sur la carte.
export const COLOR = {
  prophet: "var(--gold)",
  cheikh: "var(--gold)",
  mouqaddam: "var(--accent)",
  member: "var(--muted)",
};

// Sans photo, la calligraphie « رضي الله عنه » remplit le rond (dans l'arbre, sur la carte, dans les listes).
export const FALLBACK_IMAGE = "/images/radiya.jpg";

export function needsFallbackImage(person: PublicPerson) {
  return !person.hasImage && !person.incognito && person.kind !== "prophet";
}

// Motif SVG unique pour tous les ronds sans photo : une seule image, quel que soit le nombre de personnes.
export function fallbackPattern(definitions: SVGElement, id: string) {
  const ns = "http://www.w3.org/2000/svg";
  const pattern = document.createElementNS(ns, "pattern");
  pattern.setAttribute("id", id);
  pattern.setAttribute("patternContentUnits", "objectBoundingBox");
  pattern.setAttribute("width", "1");
  pattern.setAttribute("height", "1");
  const image = document.createElementNS(ns, "image");
  image.setAttribute("href", FALLBACK_IMAGE);
  image.setAttribute("width", "1");
  image.setAttribute("height", "1");
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  pattern.appendChild(image);
  definitions.appendChild(pattern);
  return `url(#${id})`;
}

// Taille du disque (et de la photo), selon le rang seulement : le Qutb reste une donnée de l'admin, sans effet visible.
export function discRadius(person: PublicPerson) {
  const base = person.kind === "cheikh" ? 13 : person.kind === "mouqaddam" ? 8.5 : 5;
  // Les photos sont deux fois plus grandes, pour qu'on reconnaisse les visages ; les ronds sans photo restent discrets.
  return person.hasImage || person.incognito ? base * 2 : base;
}
