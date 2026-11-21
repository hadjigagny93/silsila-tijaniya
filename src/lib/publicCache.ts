// Les fiches publiques gardées en cache sur le site (voir src/lib/data/supabase.ts) : à vider quand un admin
// connecté modifie quelque chose en ligne. Ce que le Mac envoie à la synchronisation apparaît en cinq minutes au plus.
export const PUBLIC_DATA_TAG = "public-data";
