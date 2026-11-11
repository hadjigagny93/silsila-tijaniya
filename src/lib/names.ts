// Forme réduite : « Awa Diop Ndiaye » devient « Awa N. ».
// Même règle que la vue public_persons côté base.
export function shortName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return words[0];
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}

// Initiales d'un nom translittéré : on saute les articles et les titres (al-, Sīdī, Cheikh, b.)
// et les signes ‘ ’ : « al-Ḥājj ‘Umar al-Fūtī Tāl » donne « UF ».
const SKIPPED = /^(al|as|at|ar|ad|an|ash|ad|b|bin|ibn|cheikh|shaykh|sheikh|sidi|seydi|seydil|el|hadj|hadji|hajj|hâjj|moulay|mawlay|le|la|abu|abul|abū)$/;

function bare(word: string) {
  return word.normalize("NFD").replace(/[̀-ͯ‘’ʿʾ'.]/g, "").toLowerCase();
}

export function initialsOf(name: string) {
  const words = name
    .replace(/ﷺ|\(.*?\)/g, "")
    .split(/[\s-]+/)
    .map(bare)
    .filter((word) => word && !SKIPPED.test(word));
  const first = words[0]?.[0] ?? name.trim()[0] ?? "?";
  const second = words.length > 1 ? words[1][0] : "";
  return (first + second).toUpperCase();
}
