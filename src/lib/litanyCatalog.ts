import { GROUP_COLORS, type LitanyGroup, type LitanyItem } from "./data/types";

// Litanies de la voie proposées dans Suluk : on les range dans ses séances sans rien saisir.
// La durée est une première estimation, en minutes, que chacun ajuste à son rythme.
export type CatalogItem = LitanyItem & { key: string };

export const CATALOG: { category: string; items: CatalogItem[] }[] = [
  {
    category: "Obligatoire",
    items: [
      {
        key: "lazim",
        name: "Lazim",
        arabic: "اللازم",
        count: null,
        note: "Istighfar ×100, Salat al-Fatih ×100, Haylala ×100",
        duration: 15,
      },
      {
        key: "wazifa",
        name: "Wazifa",
        arabic: "الوظيفة",
        count: null,
        note: "Istighfar ×30, Salat al-Fatih ×50, Haylala ×100, Jawharat al-Kamal ×12",
        duration: 20,
      },
      { key: "haylala", name: "Haylala du vendredi", arabic: "الهيللة", count: null, note: "Entre l'Asr et le Maghrib", duration: 30 },
    ],
  },
  {
    category: "Coran",
    items: [
      {
        key: "hizb-coran",
        name: "Deux hizb du Coran",
        arabic: "حزبان من القرآن",
        count: null,
        note: "Au minimum, chaque jour",
        duration: 25,
      },
    ],
  },
  {
    category: "Ahzab",
    items: [
      { key: "hizb-sayfi", name: "Hizb al-Sayfi", arabic: "الحزب السيفي", count: null, note: null, duration: 15 },
      { key: "hizb-mughni", name: "Hizb al-Mughni", arabic: "حزب المغني", count: null, note: null, duration: 10 },
      { key: "hizb-bahr", name: "Hizb al-Bahr", arabic: "حزب البحر", count: null, note: null, duration: 10 },
    ],
  },
  {
    category: "Azkar",
    items: [
      { key: "musabbaat-ashr", name: "Moussabbaʿat al-ʿAshr", arabic: "المسبعات العشر", count: null, note: null, duration: 15 },
      { key: "fatih-500", name: "Salat al-Fatih", arabic: "صلاة الفاتح", count: 500, note: null, duration: 25 },
      { key: "salat-jami", name: "Salat al-Jamiʿ", arabic: "صلاة الجامع", count: 1, note: null, duration: 2 },
    ],
  },
  {
    category: "Asrar",
    items: [
      { key: "fatiha-ism", name: "Fatiha bi niyyat al-ism", arabic: "الفاتحة بنية الاسم", count: null, note: null, duration: 2 },
      { key: "sirr-ziyara", name: "Sirr al-Ziyara", arabic: "سر الزيارة", count: null, note: null, duration: 5 },
      {
        key: "fatih-maratib",
        name: "Salat al-Fatih bi niyyat al-maratib",
        arabic: "صلاة الفاتح بنية المراتب",
        count: null,
        note: "Bi niyyati martabati al-zahir, wal-batin, wa batin al-batin",
        duration: 5,
      },
    ],
  },
];

export function catalogItem(key: string): LitanyItem | undefined {
  const found = CATALOG.flatMap((group) => group.items).find((item) => item.key === key);
  if (!found) return undefined;
  const { name, arabic, count, note, duration } = found;
  return { name, arabic, count, note, duration };
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function preset(
  id: string,
  anchor: LitanyGroup["anchor"],
  offset: number,
  days: number[],
  key: string,
  position: number,
): LitanyGroup {
  return {
    id,
    name: null,
    anchor,
    offset,
    time: null,
    follows: null,
    days,
    items: [catalogItem(key)!],
    color: GROUP_COLORS[position % GROUP_COLORS.length],
    position,
  };
}

// Séances proposées au premier passage. Les identifiants viennent des premières versions :
// le suivi déjà coché reste attaché à la bonne séance.
export const DEFAULT_GROUPS: LitanyGroup[] = [
  preset("lazim-matin", "fajr", 15, EVERY_DAY, "lazim", 0),
  preset("lazim-soir", "asr", 15, EVERY_DAY, "lazim", 1),
  preset("wazifa", "maghrib", 15, EVERY_DAY, "wazifa", 2),
  preset("haylala", "asr", 30, [5], "haylala", 3),
];
