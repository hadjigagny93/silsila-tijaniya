import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function getStore(): Store {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return supabaseStore;
  if (process.env.DEMO_MODE === "1") return demoStore;
  throw new Error("Configurez Supabase ou activez DEMO_MODE=1 (voir .env.example).");
}
