import { nodeDriver } from "./nodeDriver";
import { createSqlStore } from "./sqlStore";

// Base locale de l'application de bureau : le store commun, sur node:sqlite.
// Une seule ouverture par processus, même quand Next recharge les modules.
const globalState = globalThis as unknown as { silsilaStore?: ReturnType<typeof createSqlStore> };

export const sqliteStore = (globalState.silsilaStore ??= createSqlStore(() => nodeDriver(process.env.SQLITE_PATH!), {
  seedWhenEmpty: true,
}));
