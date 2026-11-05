import { Capacitor } from "@capacitor/core";
import { createSqlStore } from "@/lib/data/sqlStore";
import type { Store } from "@/lib/data/types";
import { capacitorDriver } from "./drivers/capacitor";
import { sqlJsDriver } from "./drivers/sqljs";

// Remplace src/lib/data dans l'app iPhone : le même store que sur le Mac, sur la base du téléphone.
// Pas de données de départ : tout arrive du Mac au premier échange.
export const mobileStore = createSqlStore(() => (Capacitor.isNativePlatform() ? capacitorDriver() : sqlJsDriver()), {
  seedWhenEmpty: false,
});

export function getStore(): Store {
  return mobileStore;
}
