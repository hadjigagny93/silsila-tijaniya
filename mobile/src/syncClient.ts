import { useSyncExternalStore } from "react";
import { syncOnce, type SyncRequest, type SyncResponse } from "@/lib/sync";
import { mobileStore } from "./data";
import { refresh } from "./navigation";
import { scheduleReminders } from "./notifications";

// Synchronisation vue de l'iPhone : l'adresse et le jeton du Mac viennent du QR code d'appairage,
// et sont gardés dans la base du téléphone (sync_meta), à côté des curseurs.
export type Peer = { host: string; ip: string | null; port: number; token: string };
// synced : au moins un échange a réussi, l'app a les données du Mac et peut s'ouvrir, même hors de portée.
export type SyncStatus = {
  state: "unpaired" | "idle" | "syncing" | "offline";
  at: number | null;
  synced: boolean;
  message?: string;
};

const DELAY = 3000;
const TIMEOUT = 8000;
let status: SyncStatus = { state: "unpaired", at: null, synced: false };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
}

async function meta(key: string) {
  const driver = await mobileStore.driver();
  return (await driver.get<{ value: string }>("select value from sync_meta where key = ?", [key]))?.value ?? null;
}

async function setMeta(key: string, value: string) {
  const driver = await mobileStore.driver();
  await driver.run(
    "insert into sync_meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value",
    [key, value],
  );
}

export async function readPeer(): Promise<Peer | null> {
  const raw = await meta("peer");
  return raw ? (JSON.parse(raw) as Peer) : null;
}

// Lien du QR code : silsila://pair?h=MacBook.local&p=47300&t=…&ip=192.168.1.20
export function parsePairingLink(link: string): Peer | null {
  try {
    const url = new URL(link.trim());
    const host = url.searchParams.get("h");
    const token = url.searchParams.get("t");
    if (url.protocol !== "silsila:" || !host || !token) return null;
    return { host, token, ip: url.searchParams.get("ip"), port: Number(url.searchParams.get("p")) || 47300 };
  } catch {
    return null;
  }
}

export async function pair(peer: Peer) {
  // Un nouveau Mac (ou un nouveau code) : on repart de zéro dans les deux sens.
  const previous = await readPeer();
  if (previous?.host !== peer.host) {
    await setMeta("peer_cursor", "0");
    await setMeta("sent_cursor", "0");
  }
  await setMeta("peer", JSON.stringify(peer));
  setStatus({ ...status, state: "idle" });
  await syncNow();
}

async function post(base: string, token: string, request: SyncRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(`${base}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (response.status === 401) throw new Error("Le Mac ne reconnaît plus cet iPhone : associe-le de nouveau.");
    if (!response.ok) throw new Error(`Le Mac a répondu ${response.status}.`);
    return (await response.json()) as SyncResponse;
  } finally {
    clearTimeout(timeout);
  }
}

// Essaie le nom Bonjour du Mac, puis sa dernière adresse connue.
async function send(peer: Peer, request: SyncRequest) {
  const bases = [`http://${peer.host}:${peer.port}`, ...(peer.ip ? [`http://${peer.ip}:${peer.port}`] : [])];
  let failure: unknown;
  for (const base of bases) {
    try {
      return await post(base, peer.token, request);
    } catch (error) {
      failure = error;
      if (error instanceof Error && error.message.includes("associe-le")) break;
    }
  }
  throw failure;
}

export function syncNow() {
  return (running ??= (async () => {
    clearTimeout(timer);
    const peer = await readPeer();
    if (!peer) {
      setStatus({ state: "unpaired", at: null, synced: false });
      return;
    }
    setStatus({ ...status, state: "syncing", message: undefined });
    try {
      const { received } = await syncOnce(await mobileStore.driver(), (request) => send(peer, request));
      await setMeta("synced", "1");
      setStatus({ state: "idle", at: Date.now(), synced: true });
      if (received > 0) {
        refresh();
        scheduleReminders();
      }
    } catch (error) {
      const message = error instanceof Error && error.name !== "AbortError" ? error.message : "Mac hors de portée.";
      setStatus({ ...status, state: "offline", message });
    }
  })().finally(() => (running = null)));
}

// Après une écriture : on attend un peu, pour envoyer plusieurs changements d'un coup.
export function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), DELAY);
}

export async function initialStatus() {
  const paired = Boolean(await readPeer());
  setStatus({ state: paired ? "idle" : "unpaired", at: null, synced: paired && (await meta("synced")) === "1" });
}
