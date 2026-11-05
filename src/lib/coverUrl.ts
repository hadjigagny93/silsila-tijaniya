export function coverUrl(name: string) {
  return `/images-cover/${encodeURIComponent(name)}`;
}

// Sans choix, chaque biographie garde toujours la même image, et les pages restent variées.
export function automaticCover(slug: string, covers: string[]) {
  if (covers.length === 0) return null;
  let total = 0;
  for (const letter of slug) total = (total * 31 + letter.charCodeAt(0)) >>> 0;
  return covers[total % covers.length];
}

export function shownCover(biography: { slug: string; cover: string | null }, covers: string[]) {
  if (biography.cover && covers.includes(biography.cover)) return biography.cover;
  return automaticCover(biography.slug, covers);
}
