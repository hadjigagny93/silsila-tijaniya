// Vérifie la synchronisation entre deux bases : node --experimental-strip-types n'est pas utilisé,
// on lance ce script avec tsx : npx tsx scripts/sync-test.mts <base-mac> <base-iphone>
import { nodeDriver } from "../src/lib/data/nodeDriver";
import { createSqlStore } from "../src/lib/data/sqlStore";
import { answerSync, syncOnce } from "../src/lib/sync";

const [macPath, phonePath] = process.argv.slice(2);
const mac = createSqlStore(() => nodeDriver(macPath), { seedWhenEmpty: true });
const phone = createSqlStore(() => nodeDriver(phonePath), { seedWhenEmpty: false });
const macDb = await mac.driver();
const phoneDb = await phone.driver();
const sync = () => syncOnce(phoneDb, (request) => answerSync(macDb, request));
const check = (label: string, ok: boolean) => {
  console.log(`${ok ? "OK " : "ÉCHEC"} ${label}`);
  if (!ok) process.exitCode = 1;
};
const tables = ["persons", "person_images", "biographies", "litanies", "abdal", "wird_log", "stations", "station_history"];
async function snapshot(driver: typeof macDb) {
  const out: Record<string, string> = {};
  for (const table of tables) {
    const rows = await driver.all<Record<string, unknown>>(`select * from ${table}`);
    out[table] = JSON.stringify(
      rows
        .map((row) => {
          const { sync_seq, ...rest } = row;
          void sync_seq;
          // Clés triées : l'ordre des colonnes peut varier d'une base à l'autre (colonnes ajoutées plus tard).
          const sorted = Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)));
          return JSON.stringify(sorted, (_, value) => (value instanceof Uint8Array ? `b:${value.length}:${value[0]}` : value));
        })
        .sort(),
    );
  }
  return out;
}
async function same(label: string) {
  const [a, b] = [await snapshot(macDb), await snapshot(phoneDb)];
  check(label, tables.every((table) => a[table] === b[table]));
  for (const table of tables) if (a[table] !== b[table]) console.log("   diffère :", table);
}

// 0. Une écriture faite juste après la migration doit partir au premier échange suivant.
await mac.setWird("local", "2030-02-02", "juste-apres-migration", true);

// 1. Premier échange : l'iPhone vide reçoit tout.
let result = await sync();
console.log("   premier échange", result);
check("premier échange : l'iPhone a toutes les personnes", (await phone.listPersons()).length === (await mac.listPersons()).length);
check("premier échange : les biographies", (await phone.listBiographies()).length === (await mac.listBiographies()).length);
await same("premier échange : bases identiques");

check("écriture d'après migration reçue", (await phone.listWird("local", "2030-02-02", "2030-02-02")).length === 1);
await mac.setWird("local", "2030-02-03", "apres-premier-echange", true);
await sync();
check("écriture du Mac après le premier échange reçue", (await phone.listWird("local", "2030-02-03", "2030-02-03")).length === 1);

// 2. Un second échange n'a presque rien à faire (au plus l'écho du premier), un troisième rien du tout.
await sync();
result = await sync();
check(`pas de boucle (troisième échange : ${result.sent} envoyées, ${result.received} reçues)`, result.sent === 0 && result.received === 0);

// 3. Des deux côtés à la fois : une coche sur l'iPhone, une nouvelle séance sur le Mac.
const day = "2030-01-01";
await phone.setWird("local", day, "test-iphone", true);
const groups = await mac.listGroups("local");
await mac.saveGroup("local", { ...groups[0], id: "test-mac", name: "Séance du Mac", position: 99 });
await sync();
check("coche de l'iPhone arrivée sur le Mac", (await mac.listWird("local", day, day)).some((entry) => entry.litany === "test-iphone"));
check("séance du Mac arrivée sur l'iPhone", (await phone.listGroups("local")).some((group) => group.id === "test-mac"));
await same("après modifications des deux côtés : bases identiques");

// 4. Une suppression voyage.
await phone.setWird("local", day, "test-iphone", false);
await mac.deleteGroup("local", "test-mac");
await sync();
check("décoche propagée", !(await mac.listWird("local", day, day)).some((entry) => entry.litany === "test-iphone"));
check("suppression de séance propagée", !(await phone.listGroups("local")).some((group) => group.id === "test-mac"));

// 5. Même ligne changée des deux côtés : la plus récente gagne.
const slug = (await mac.listBiographies())[0].slug;
const bio = (await mac.getBiography(slug))!;
await mac.saveBiography({ ...bio, sources: bio.sources.join("\n"), summary: "version Mac", personId: null });
await new Promise((done) => setTimeout(done, 20));
await phone.saveBiography({ ...bio, sources: bio.sources.join("\n"), summary: "version iPhone", personId: null });
await sync();
check("conflit : la plus récente (iPhone) gagne sur le Mac", (await mac.getBiography(slug))!.summary === "version iPhone");
check("conflit : l'iPhone garde la sienne", (await phone.getBiography(slug))!.summary === "version iPhone");
await sync();
await same("après conflit : bases identiques");

// 6. Les images arrivent intactes.
const macImages = await macDb.all<{ person_id: string }>("select person_id from person_images where deleted = 0 limit 1");
if (macImages[0]) {
  const a = await mac.getPersonImage(macImages[0].person_id);
  const b = await phone.getPersonImage(macImages[0].person_id);
  check("image identique sur l'iPhone", Boolean(a && b && a.length === b.length && a.every((byte, i) => byte === b[i])));
}
