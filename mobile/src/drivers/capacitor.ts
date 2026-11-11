import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { SqlDriver, SqlValue } from "@/lib/data/sqlDriver";

// Pilote de l'iPhone : SQLite natif, la base reste dans l'app (et dans les sauvegardes de l'iPhone).
const NAME = "silsila";

// Le plugin iOS reçoit un BLOB comme un objet indexé ({0: octet, 1: octet…}) et le rend en liste d'octets.
const outgoing = (params: SqlValue[] = []) =>
  params.map((value) => (value instanceof Uint8Array ? Object.fromEntries(value.entries()) : value));

// Sur iOS, le plugin ajoute en tête une ligne qui décrit les colonnes (ios_columns) : on l'écarte.
function incoming<T>(rows: unknown[] | undefined): T[] {
  return (rows ?? []).filter((row) => !(row && typeof row === "object" && "ios_columns" in row)).map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      out[key] = Array.isArray(value) ? new Uint8Array(value as number[]) : value;
    }
    return out as T;
  });
}

export function capacitorDriver(): SqlDriver {
  let connection: Promise<SQLiteDBConnection> | null = null;
  const db = () =>
    (connection ??= (async () => {
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      await sqlite.checkConnectionsConsistency().catch(() => undefined);
      const existing = (await sqlite.isConnection(NAME, false)).result;
      const handle = existing
        ? await sqlite.retrieveConnection(NAME, false)
        : await sqlite.createConnection(NAME, false, "no-encryption", 1, false);
      await handle.open();
      return handle;
    })());

  return {
    async all<T>(sql: string, params?: SqlValue[]) {
      const result = await (await db()).query(sql, outgoing(params), false);
      return incoming<T>(result.values);
    },
    async get<T>(sql: string, params?: SqlValue[]) {
      const result = await (await db()).query(sql, outgoing(params), false);
      return incoming<T>(result.values)[0];
    },
    async run(sql, params) {
      await (await db()).run(sql, outgoing(params), false, "no", false);
    },
    async exec(sql) {
      await (await db()).execute(sql, false, false);
    },
    async transaction(fn) {
      const handle = await db();
      await handle.beginTransaction();
      try {
        const result = await fn();
        await handle.commitTransaction();
        return result;
      } catch (error) {
        await handle.rollbackTransaction();
        throw error;
      }
    },
  };
}
