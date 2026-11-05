import { GROUP_COLORS, type LitanyGroup, type LitanyItem, type Prayer } from "./types";

// Forme d'une ligne de la table litanies, commune à SQLite et à Supabase.
// Une ligne est un groupe : ses litanies sont rangées en JSON dans items.
export type GroupRow = {
  id: string;
  name: string;
  arabic: string | null;
  anchor: Prayer | "fixed" | "after";
  offset_minutes: number;
  fixed_time: string | null;
  count: number | null;
  days: string;
  note: string | null;
  position: number;
  items: string | null;
  color: string | null;
  follows: string | null;
};

// Litanies enregistrées avant l'estimation du temps : dix minutes par défaut.
const DEFAULT_DURATION = 10;

export function toGroup(row: GroupRow): LitanyGroup {
  // Les lignes d'avant les groupes décrivent une seule litanie.
  const stored: Partial<LitanyItem>[] = row.items
    ? JSON.parse(row.items)
    : [{ name: row.name, arabic: row.arabic, count: row.count, note: row.note }];
  const items = stored.map((item) => ({
    name: item.name ?? "",
    arabic: item.arabic ?? null,
    count: item.count ?? null,
    note: item.note ?? null,
    duration: item.duration ?? DEFAULT_DURATION,
  }));
  return {
    id: row.id,
    name: row.items ? row.name || null : null,
    anchor: row.anchor,
    offset: row.offset_minutes,
    time: row.fixed_time,
    follows: row.anchor === "after" ? row.follows : null,
    days: [...row.days].map(Number),
    items,
    color: row.color ?? GROUP_COLORS[row.position % GROUP_COLORS.length],
    position: row.position,
  };
}

export function groupRow(userId: string, group: LitanyGroup) {
  return {
    user_id: userId,
    id: group.id,
    name: group.name ?? "",
    arabic: null,
    anchor: group.anchor,
    offset_minutes: group.offset,
    fixed_time: group.time,
    count: null,
    days: group.days.join(""),
    note: null,
    position: group.position,
    items: JSON.stringify(group.items),
    color: group.color,
    follows: group.follows,
  };
}
