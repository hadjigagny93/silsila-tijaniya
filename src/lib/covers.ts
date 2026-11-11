import { readdirSync } from "node:fs";
import { join } from "node:path";
import { coverUrl, shownCover } from "./coverUrl";

const IMAGE = /\.(jpe?g|png|webp)$/i;

function listImages(folder: string) {
  try {
    return readdirSync(join(process.cwd(), "public", folder)).filter((name) => IMAGE.test(name)).sort();
  } catch {
    return [];
  }
}

// Le dossier images-cover est copié dans public à la construction de l'app.
export function listCovers() {
  return listImages("images-cover");
}

// Une image par station, nommée d'après elle (sabr.jpg, tawba.webp…) dans images-stations.
export function stationImages() {
  const images = new Map<string, string>();
  for (const name of listImages("images-stations")) {
    images.set(name.replace(IMAGE, ""), `/images-stations/${encodeURIComponent(name)}`);
  }
  return images;
}

// Banque d'images des cadrans de Suluk : il suffit d'ajouter des fichiers dans cover-suluk.
// Chaque cadran tire une image au hasard à chaque visite, sans doublon tant qu'il y en a assez.
export function sulukCovers(count: number) {
  const pool = listImages("cover-suluk");
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
