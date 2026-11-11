import { randomBytes, timingSafeEqual } from "node:crypto";
import { networkInterfaces, hostname } from "node:os";
import type { SqlDriver } from "./data/sqlDriver";

// Appairage du Mac avec un iPhone : un jeton secret, partagé une fois par QR code,
// que l'iPhone présente à chaque synchronisation. Le changer coupe l'accès à l'ancien appareil.
export const SYNC_PORT = 47300;

export async function pairToken(driver: SqlDriver) {
  const row = await driver.get<{ value: string }>("select value from sync_meta where key = 'pair_token'");
  if (row) return row.value;
  return renewPairToken(driver);
}

export async function renewPairToken(driver: SqlDriver) {
  const token = randomBytes(24).toString("base64url");
  await driver.run(
    "insert into sync_meta (key, value) values ('pair_token', ?) on conflict (key) do update set value = excluded.value",
    [token],
  );
  return token;
}

export async function isPaired(driver: SqlDriver, presented: string | null) {
  if (!presented) return false;
  const expected = Buffer.from(await pairToken(driver));
  const given = Buffer.from(presented);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Comment l'iPhone joint le Mac : son nom Bonjour (« MacBook-de-Seun.local »), et ses adresses
// sur le réseau local, au cas où le nom ne se résoudrait pas.
export function lanAddress() {
  const name = (process.env.SILSILA_LAN_HOST || hostname()).replace(/\.local$/, "");
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry!.address);
  return { host: `${name}.local`, addresses };
}

export function pairingLink(token: string) {
  const { host, addresses } = lanAddress();
  const params = new URLSearchParams({ h: host, p: String(SYNC_PORT), t: token });
  if (addresses[0]) params.set("ip", addresses[0]);
  return `silsila://pair?${params}`;
}
