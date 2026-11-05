import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SqlDriver, SqlValue } from "./sqlDriver";

// Pilote du Mac : node:sqlite est synchrone, on l'enveloppe dans l'interface asynchrone commune.
export function nodeDriver(path: string): SqlDriver {
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  const values = (params: SqlValue[] = []) => params as SQLInputValue[];
  return {
    async all<T>(sql: string, params?: SqlValue[]) {
      return database.prepare(sql).all(...values(params)) as T[];
    },
    async get<T>(sql: string, params?: SqlValue[]) {
      return database.prepare(sql).get(...values(params)) as T | undefined;
    },
    async run(sql, params) {
      database.prepare(sql).run(...values(params));
    },
    async exec(sql) {
      database.exec(sql);
    },
    async transaction(fn) {
      database.exec("begin");
      try {
        const result = await fn();
        database.exec("commit");
        return result;
      } catch (error) {
        database.exec("rollback");
        throw error;
      }
    },
  };
}
