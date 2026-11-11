import { fromBase64, toBase64 } from "./base64";
import type { SqlDriver, SqlValue } from "./data/sqlDriver";
import { SYNC_TABLES } from "./data/sqlStore";

// Synchronisation entre le Mac et l'iPhone, sans serveur extérieur.
// Chaque appareil envoie les lignes écrites depuis le dernier échange (sync_seq), et garde, pour chaque ligne,
// la version la plus récente (sync_rev). Les suppressions voyagent comme des lignes marquées deleted = 1.

// Une ligne telle qu'elle voyage : les images (BLOB) sont encodées en base64.
export type SyncValue = string | number | null | { $b64: string };
export type SyncRow = Record<string, SyncValue>;
export type SyncRows = Record<string, SyncRow[]>;

// Ce que reçoit le Mac, et ce qu'il renvoie : les changements de l'autre côté depuis le curseur.
export type SyncRequest = { device: string; since: number; rows: SyncRows };
export type SyncResponse = { device: string; cursor: number; rows: SyncRows };

// sync_seq ne voyage pas : c'est un numéro d'ordre propre à chaque appareil.
const LOCAL_ONLY = new Set(["sync_seq"]);

function encode(value: unknown): SyncValue {
  if (value instanceof Uint8Array) return { $b64: toBase64(value) };
  if (typeof value === "bigint") return Number(value);
  return value as SyncValue;
}

function decode(value: SyncValue): SqlValue {
  return value && typeof value === "object" ? fromBase64(value.$b64) : value;
}

// Comparaison stable du contenu : deux versions écrites à la même milliseconde se départagent pareil
// sur les deux appareils, pour que les bases finissent identiques.
function fingerprint(row: SyncRow) {
  return JSON.stringify(Object.keys(row).sort().map((key) => [key, row[key]]));
}

export async function deviceId(driver: SqlDriver) {
  const row = await driver.get<{ value: string }>("select value from sync_meta where key = 'device'");
  return row!.value;
}

async function columnsOf(driver: SqlDriver, table: string) {
  const rows = await driver.all<{ name: string }>(`pragma table_info(${table})`);
  return rows.map((row) => row.name).filter((name) => !LOCAL_ONLY.has(name));
}

// Les lignes écrites après le curseur `since`, et le nouveau curseur à garder pour la prochaine fois.
export async function exportChanges(driver: SqlDriver, since: number) {
  const rows: SyncRows = {};
  let cursor = since;
  for (const table of Object.keys(SYNC_TABLES)) {
    const columns = await columnsOf(driver, table);
    const found = await driver.all<Record<string, unknown> & { sync_seq: number }>(
      `select ${columns.join(", ")}, sync_seq from ${table} where sync_seq > ? order by sync_seq`,
      [since],
    );
    if (found.length === 0) continue;
    rows[table] = found.map((row) => {
      cursor = Math.max(cursor, Number(row.sync_seq));
      return Object.fromEntries(columns.map((column) => [column, encode(row[column])]));
    });
  }
  return { rows, cursor };
}

// Applique un lot reçu : chaque ligne n'est écrite que si elle est plus récente que la version locale.
// Renvoie le nombre de lignes réellement écrites.
export async function applyChanges(driver: SqlDriver, incoming: SyncRows) {
  let written = 0;
  // Les liens (mouqaddam, image → personne) peuvent arriver dans le désordre : on vérifie à la fin.
  await driver.exec("pragma foreign_keys = off");
  try {
    await driver.transaction(async () => {
      await driver.run("update sync_meta set value = '1' where key = 'applying'");
      for (const [table, keys] of Object.entries(SYNC_TABLES)) {
        const rows = incoming[table];
        if (!rows?.length) continue;
        const known = new Set(await columnsOf(driver, table));
        // Deux colonnes uniques des personnes peuvent changer de main dans le même lot :
        // on les pose en second, quand toutes les lignes sont là.
        const deferred = table === "persons" ? ["biography_slug", "user_id"] : [];
        const later: SyncRow[] = [];

        for (const row of rows) {
          const columns = Object.keys(row).filter((column) => known.has(column));
          if (!keys.every((key) => columns.includes(key)) || !columns.includes("sync_rev")) continue;
          const where = keys.map((key) => `${key} = ?`).join(" and ");
          const local = await driver.get<Record<string, unknown>>(
            `select ${columns.join(", ")} from ${table} where ${where}`,
            keys.map((key) => decode(row[key])),
          );
          if (local) {
            const mine = Object.fromEntries(columns.map((column) => [column, encode(local[column])]));
            const theirs = Number(row.sync_rev);
            const ours = Number(mine.sync_rev);
            if (theirs < ours || (theirs === ours && fingerprint(row) <= fingerprint(mine))) continue;
          }
          const values = columns.map((column) => (deferred.includes(column) ? null : decode(row[column])));
          const updates = columns.filter((column) => !keys.includes(column));
          await driver.run(
            `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})
             on conflict (${keys.join(", ")}) do update set ${updates.map((column) => `${column} = excluded.${column}`).join(", ")}`,
            values,
          );
          if (deferred.length) later.push(row);
          written++;
        }

        for (const row of later) {
          const columns = deferred.filter((column) => column in row && known.has(column));
          if (columns.length === 0) continue;
          await driver.run(
            `update ${table} set ${columns.map((column) => `${column} = ?`).join(", ")} where ${keys.map((key) => `${key} = ?`).join(" and ")}`,
            [...columns.map((column) => decode(row[column])), ...keys.map((key) => decode(row[key]))],
          );
        }
      }
      await driver.run("update sync_meta set value = '0' where key = 'applying'");
    });
  } finally {
    await driver.run("update sync_meta set value = '0' where key = 'applying'");
    await driver.exec("pragma foreign_keys = on");
  }
  return written;
}

async function readMeta(driver: SqlDriver, key: string) {
  const row = await driver.get<{ value: string }>("select value from sync_meta where key = ?", [key]);
  return Number(row?.value ?? 0);
}

async function writeMeta(driver: SqlDriver, key: string, value: number) {
  await driver.run(
    "insert into sync_meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value",
    [key, String(value)],
  );
}

// Un échange côté iPhone : envoie ses changements depuis le dernier envoi réussi, reçoit ceux du Mac
// depuis le dernier curseur du Mac, et ne garde les nouveaux curseurs qu'une fois tout appliqué.
export async function syncOnce(driver: SqlDriver, send: (request: SyncRequest) => Promise<SyncResponse>) {
  const sent = await readMeta(driver, "sent_cursor");
  const peer = await readMeta(driver, "peer_cursor");
  const outgoing = await exportChanges(driver, sent);
  const response = await send({ device: await deviceId(driver), since: peer, rows: outgoing.rows });
  const received = await applyChanges(driver, response.rows);
  await writeMeta(driver, "sent_cursor", outgoing.cursor);
  await writeMeta(driver, "peer_cursor", response.cursor);
  const count = (rows: SyncRows) => Object.values(rows).reduce((sum, list) => sum + list.length, 0);
  return { sent: count(outgoing.rows), received };
}

// Un échange côté Mac : on note d'abord ce qu'on a à envoyer, puis on applique ce qui arrive.
export async function answerSync(driver: SqlDriver, request: SyncRequest): Promise<SyncResponse> {
  const { rows, cursor } = await exportChanges(driver, request.since);
  await applyChanges(driver, request.rows);
  return { device: await deviceId(driver), cursor, rows };
}
