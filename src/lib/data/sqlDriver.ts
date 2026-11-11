// Accès SQLite commun au Mac (node:sqlite) et à l'iPhone (Capacitor) : le même store tourne sur les deux.
export type SqlValue = string | number | null | Uint8Array;

export interface SqlDriver {
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  // Plusieurs instructions d'un coup (schéma, migrations).
  exec(sql: string): Promise<void>;
  // Exécute fn d'un bloc : tout est écrit, ou rien.
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
