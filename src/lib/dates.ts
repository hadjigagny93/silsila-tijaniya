// Une année est exacte (« 1855 ») ou approximative (« vers 1855 »).

export function yearOf(value: string | null) {
  return value ? (/\d{4}/.exec(value)?.[0] ?? null) : null;
}

// Un point d'interrogation si elle est inconnue.
export function yearLabel(value: string | null) {
  return value ?? "?";
}

export function periodOf(birthDate: string | null, deathDate: string | null) {
  return [birthDate, deathDate].filter(Boolean).join(" – ");
}

// Du plus ancien au plus récent ; les années inconnues ferment la liste.
export function compareBirthYears(a: string | null, b: string | null) {
  const first = yearOf(a);
  const second = yearOf(b);
  if (first === second) return 0;
  if (!first) return 1;
  if (!second) return -1;
  return Number(first) - Number(second);
}

export function isValidYear(value: string) {
  return /^(vers )?\d{4}$/.test(value);
}
