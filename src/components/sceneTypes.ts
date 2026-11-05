import type { PublicPerson } from "@/lib/data/types";

export type TreeDisplay = "photo" | "name";

export type SceneApi = {
  select(id: string | null): void;
  // Propre à l'arbre : la vue planétaire n'a qu'un seul affichage.
  setDisplay?(display: TreeDisplay): void;
  setIsolated?(isolated: boolean): void;
  setGeneration?(generation: number | null): void;
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
  onSelect(id: string | null): void;
};

export function prefersCalm() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

