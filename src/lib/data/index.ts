import { sqliteStore } from "./sqlite";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function getStore(): Store {
  if (process.env.SQLITE_PATH) return sqliteStore;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return supabaseStore;
  throw new Error("Configurez SQLITE_PATH ou Supabase (voir .env.example).");
}
