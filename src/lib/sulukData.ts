import { getStore } from "./data";
import { DEFAULT_GROUPS } from "./litanyCatalog";
import { DEFAULT_SETTINGS } from "./suluk";

// Au premier passage, chaque utilisateur reçoit ses réglages et les séances de base.
export async function loadSuluk(userId: string) {
  const store = getStore();
  let settings = await store.getSulukSettings(userId);
  if (!settings) {
    await store.initSuluk(userId, DEFAULT_SETTINGS, DEFAULT_GROUPS);
    settings = DEFAULT_SETTINGS;
  }
  return { settings, groups: await store.listGroups(userId) };
}
