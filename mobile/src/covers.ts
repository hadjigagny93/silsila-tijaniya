import { coverUrl, shownCover } from "@/lib/coverUrl";
import manifest from "virtual:silsila-images";

// Remplace src/lib/covers dans l'app iPhone : la liste des images est fixée à la construction de l'app
// (les fichiers sont copiés dans ses ressources), au lieu d'être lue sur le disque.
const IMAGE = /\.(jpe?g|png|webp)$/i;

export function listCovers() {
  return manifest["images-cover"];
}

export function stationImages() {
  const images = new Map<string, string>();
  for (const name of manifest["images-stations"]) {
    images.set(name.replace(IMAGE, ""), `/images-stations/${encodeURIComponent(name)}`);
  }
  return images;
}

export function sulukCovers(count: number) {
  const pool = [...manifest["cover-suluk"]];
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return Array.from({ length: count }, (_, index) =>
    pool.length ? `/cover-suluk/${encodeURIComponent(pool[index % pool.length])}` : null,
  );
}

export function coverStyle(biography: { slug: string; cover: string | null }, covers: string[]) {
  const cover = shownCover(biography, covers);
  return cover ? { background: `url("${coverUrl(cover)}") center / cover` } : undefined;
}

export { coverUrl, shownCover };
