import type { PersonKind } from "./types";

// Garder en phase avec supabase/migrations/0002_seed.sql.
export const seedPersons: {
  id: string;
  kind: PersonKind;
  fullName: string;
  mouqaddamId: string | null;
  biographySlug: string | null;
}[] = [
  { id: "00000000-0000-4000-8000-000000000001", kind: "prophet", fullName: "Le Prophète Muhammad ﷺ", mouqaddamId: null, biographySlug: null },
  { id: "00000000-0000-4000-8000-000000000002", kind: "cheikh", fullName: "Cheikh Ahmad Tijani", mouqaddamId: "00000000-0000-4000-8000-000000000001", biographySlug: "ahmad-tijani" },
  { id: "00000000-0000-4000-8000-000000000003", kind: "cheikh", fullName: "Sidi Ali Harazem Berrada", mouqaddamId: "00000000-0000-4000-8000-000000000002", biographySlug: "ali-harazem" },
  { id: "00000000-0000-4000-8000-000000000004", kind: "cheikh", fullName: "Sidi Muhammad al-Ghali", mouqaddamId: "00000000-0000-4000-8000-000000000002", biographySlug: null },
  { id: "00000000-0000-4000-8000-000000000005", kind: "cheikh", fullName: "El Hadj Omar Tall", mouqaddamId: "00000000-0000-4000-8000-000000000004", biographySlug: "omar-tall" },
  { id: "00000000-0000-4000-8000-000000000006", kind: "cheikh", fullName: "El Hadj Malick Sy", mouqaddamId: null, biographySlug: "malick-sy" },
  { id: "00000000-0000-4000-8000-000000000007", kind: "cheikh", fullName: "Cheikh Abdoulaye Niasse", mouqaddamId: null, biographySlug: "abdoulaye-niasse" },
  { id: "00000000-0000-4000-8000-000000000008", kind: "cheikh", fullName: "Cheikh Ibrahima Niasse", mouqaddamId: "00000000-0000-4000-8000-000000000007", biographySlug: "ibrahima-niasse" },
];
