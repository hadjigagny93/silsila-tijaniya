// Forme réduite : « Awa Diop Ndiaye » devient « Awa N. ».
// Même règle que la vue public_persons côté base.
export function shortName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}
