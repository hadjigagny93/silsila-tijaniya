import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { SqlDriver, SqlValue } from "@/lib/data/sqlDriver";

// Pilote du navigateur, pour essayer l'app hors de l'iPhone : SQLite en WebAssembly,
// gardé dans IndexedDB entre deux rechargements.
const STORE = "silsila";

function idb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(STORE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function load(): Promise<Uint8Array | null> {
  const database = await idb();
  return new Promise((resolve) => {
    const request = database.transaction("files").objectStore("files").get("db");
    request.onsuccess = () => resolve((request.result as Uint8Array | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

async function save(bytes: Uint8Array) {
  const database = await idb();
  database.transaction("files", "readwrite").objectStore("files").put(bytes, "db");
}

export function sqlJsDriver(): SqlDriver {
  let opened: Promise<Database> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let depth = 0;
  const db = () =>
    (opened ??= (async () => {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });
      const saved = await load();
      return saved ? new SQL.Database(saved) : new SQL.Database();
    })());
  const persist = async () => {
    const database = await db();
    clearTimeout(timer);
    timer = setTimeout(() => void save(database.export()), 300);
  };
  const select = async <T>(sql: string, params: SqlValue[] = []) => {
    const database = await db();
    const statement = database.prepare(sql);
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    statement.free();
    return rows;
  };

  return {
    all: select,
    async get<T>(sql: string, params?: SqlValue[]) {
      return (await select<T>(sql, params))[0];
    },
    async run(sql, params = []) {
      (await db()).run(sql, params);
      if (depth === 0) await persist();
    },
    async exec(sql) {
      (await db()).exec(sql);
      if (depth === 0) await persist();
    },
    async transaction(fn) {
      const database = await db();
      database.exec("begin");
      depth++;
      try {
        const result = await fn();
        database.exec("commit");
        return result;
      } catch (error) {
        database.exec("rollback");
        throw error;
      } finally {
        depth--;
        await persist();
      }
    },
  };
}
