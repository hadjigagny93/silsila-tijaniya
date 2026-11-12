import { biographies as seedBiographies } from "@/content/biographies";
import { fromBase64 } from "@/lib/base64";
import { shortName } from "@/lib/names";
import { slugify } from "@/lib/slug";
import { seedPersons } from "./seed";
import { groupRow, toGroup, type GroupRow } from "./litanyRows";
import type { SqlDriver, SqlValue } from "./sqlDriver";
import type {
  Biography,
  DisplayMode,
  ExerciseKind,
  JournalEntry,
  LitanyGroup,
  NewMouqaddam,
  PersonKind,
  PrayerMethod,
  StationChange,
  StationFocus,
  StationMoment,
  StationState,
  Store,
  WirdEntry,
} from "./types";

// Base locale, la même sur le Mac et sur l'iPhone : un seul utilisateur, sans connexion.
// Le schéma suit celui de supabase/migrations pour faciliter une mise en ligne.
// Chaque ligne porte sync_rev (dernière écriture, en millisecondes) et deleted (suppression douce) :
// c'est ce que la synchronisation entre appareils échange.

const LOCAL_USER = "local";

const SCHEMA = `
  create table if not exists persons (
    id text primary key,
    kind text not null default 'member',
    full_name text not null,
    display_mode text not null default 'full',
    city text,
    mouqaddam_id text references persons (id) on delete set null,
    biography_slug text unique,
    user_id text unique,
    hidden integer not null default 0,
    created_at text not null default (datetime('now'))
  );
  create index if not exists persons_mouqaddam_id_idx on persons (mouqaddam_id);

  create table if not exists person_images (
    person_id text primary key references persons (id) on delete cascade,
    data blob not null,
    updated_at text not null default (datetime('now'))
  );

  create table if not exists biographies (
    slug text primary key,
    name text not null,
    period text not null default '',
    summary text not null default '',
    body text not null default '',
    sources text not null default '',
    draft integer not null default 1,
    updated_at text not null default (datetime('now'))
  );

  create table if not exists wird_log (
    user_id text not null,
    day text not null,
    practice text not null,
    created_at text not null default (datetime('now')),
    primary key (user_id, day, practice)
  );

  create table if not exists suluk_settings (
    user_id text primary key,
    city text not null,
    latitude real not null,
    longitude real not null,
    method text not null,
    timezone text not null default 'Africa/Dakar'
  );

  create table if not exists abdal (
    user_id text not null,
    id text not null,
    pillar text not null,
    days text not null,
    start_time text,
    end_time text,
    note text,
    position integer not null default 0,
    primary key (user_id, id)
  );

  create table if not exists stations (
    user_id text not null,
    station text not null,
    degree integer not null default 0,
    note text,
    explanation text,
    updated_at text not null default (datetime('now')),
    primary key (user_id, station)
  );

  create table if not exists station_history (
    user_id text not null,
    station text not null,
    degree integer not null,
    at text not null default (datetime('now'))
  );
  create index if not exists station_history_idx on station_history (user_id, station);

  create table if not exists station_moments (
    user_id text not null,
    id text not null,
    station text not null,
    day text not null,
    text text not null,
    primary key (user_id, id)
  );

  create table if not exists station_focus (
    user_id text primary key,
    station text not null,
    start text not null,
    days integer not null
  );

  create table if not exists suluk_journal (
    user_id text not null,
    day text not null,
    key text not null,
    text text not null,
    primary key (user_id, day, key)
  );

  create table if not exists litanies (
    user_id text not null,
    id text not null,
    name text not null,
    arabic text,
    anchor text not null,
    offset_minutes integer not null default 0,
    fixed_time text,
    count integer,
    days text not null default '0123456',
    note text,
    position integer not null default 0,
    items text,
    color text,
    primary key (user_id, id)
  );

  create table if not exists person_links (
    id text primary key,
    person_id text not null,
    master_id text not null,
    created_at text not null default (datetime('now'))
  );
  create index if not exists person_links_person_idx on person_links (person_id);

  create table if not exists sync_meta (
    key text primary key,
    value text not null
  );
`;

// Tables échangées entre appareils, avec la clé qui identifie une ligne.
export const SYNC_TABLES: Record<string, string[]> = {
  persons: ["id"],
  person_links: ["id"],
  person_images: ["person_id"],
  biographies: ["slug"],
  wird_log: ["user_id", "day", "practice"],
  suluk_settings: ["user_id"],
  abdal: ["user_id", "id"],
  stations: ["user_id", "station"],
  station_history: ["id"],
  station_moments: ["user_id", "id"],
  station_focus: ["user_id"],
  suluk_journal: ["user_id", "day", "key"],
  litanies: ["user_id", "id"],
};

// Heure courante en millisecondes, calculée par SQLite.
export const NOW_MS = "cast((julianday('now') - 2440587.5) * 86400000 as integer)";

// Colonnes ajoutées après la première version : une base existante les reçoit à l'ouverture.
const PERSON_COLUMNS = [
  "birth_date",
  "death_date",
  "birth_city",
  "zawiya",
  "nicknames",
  "birth_country",
  "death_city",
  "death_country",
  "qutb",
  "prophet_family",
];

async function columnsOf(driver: SqlDriver, table: string) {
  const rows = await driver.all<{ name: string }>(`pragma table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

async function addMissingColumns(driver: SqlDriver) {
  const persons = await columnsOf(driver, "persons");
  for (const column of PERSON_COLUMNS) {
    if (!persons.has(column)) await driver.exec(`alter table persons add column ${column} text`);
  }

  const litanies = await columnsOf(driver, "litanies");
  for (const column of ["items", "color", "follows"]) {
    if (!litanies.has(column)) await driver.exec(`alter table litanies add column ${column} text`);
  }

  if (!(await columnsOf(driver, "abdal")).has("note")) await driver.exec("alter table abdal add column note text");

  if (!(await columnsOf(driver, "suluk_settings")).has("timezone")) {
    await driver.exec("alter table suluk_settings add column timezone text not null default 'Africa/Dakar'");
  }

  if (!(await columnsOf(driver, "biographies")).has("cover")) {
    await driver.exec("alter table biographies add column cover text");
  }

  // L'historique des degrés n'avait pas de clé : chaque changement reçoit un identifiant.
  if (!(await columnsOf(driver, "station_history")).has("id")) {
    await driver.exec("alter table station_history add column id text");
  }
  await driver.exec(
    `update station_history set id = lower(hex(randomblob(16))) where id is null;
     create unique index if not exists station_history_id_idx on station_history (id);`,
  );
}

// Prépare chaque table à la synchronisation. Trois colonnes :
// - sync_rev : date de la dernière écriture, en millisecondes, qui départage deux versions d'une même ligne ;
//   pendant l'application d'un lot reçu (applying = 1), la date d'origine est gardée ;
// - sync_seq : numéro d'ordre local, qui avance à chaque écriture, reçue ou non ; c'est lui qui dit
//   « ce qui a changé depuis la dernière fois », sans dépendre des horloges des appareils ;
// - deleted : suppression douce, pour que les suppressions voyagent aussi.
async function prepareSync(driver: SqlDriver) {
  await driver.exec(
    `insert or ignore into sync_meta (key, value) values ('applying', '0');
     insert or ignore into sync_meta (key, value) values ('seq', '0');
     insert or ignore into sync_meta (key, value) values ('device', lower(hex(randomblob(16))));
     update sync_meta set value = '0' where key = 'applying';`,
  );
  const applying = "(select value from sync_meta where key = 'applying') = '0'";
  for (const table of Object.keys(SYNC_TABLES)) {
    const columns = await columnsOf(driver, table);
    if (!columns.has("sync_rev")) {
      await driver.exec(`alter table ${table} add column sync_rev integer not null default 0`);
      await driver.exec(`update ${table} set sync_rev = ${NOW_MS}`);
    }
    if (!columns.has("sync_seq")) {
      await driver.exec(`alter table ${table} add column sync_seq integer not null default 1`);
    }
    if (!columns.has("deleted")) await driver.exec(`alter table ${table} add column deleted integer not null default 0`);
    const stamp = `begin
         update sync_meta set value = cast(value as integer) + 1 where key = 'seq';
         update ${table} set
           sync_seq = (select cast(value as integer) from sync_meta where key = 'seq'),
           sync_rev = case when ${applying} then ${NOW_MS} else sync_rev end
         where rowid = new.rowid;
       end;`;
    await driver.exec(
      `drop trigger if exists ${table}_rev_insert;
       drop trigger if exists ${table}_rev_update;
       create index if not exists ${table}_sync_seq_idx on ${table} (sync_seq);
       create trigger if not exists ${table}_sync_insert after insert on ${table} ${stamp}
       create trigger if not exists ${table}_sync_update after update on ${table} ${stamp}`,
    );
  }
  // Le compteur part toujours au-delà des numéros déjà posés (lignes reprises lors de la migration).
  const highest = Object.keys(SYNC_TABLES)
    .map((table) => `select max(sync_seq) as seq from ${table}`)
    .join(" union all ");
  await driver.exec(
    `update sync_meta set value = max(cast(value as integer), (select coalesce(max(seq), 0) from (${highest})))
     where key = 'seq'`,
  );
}

type PersonRow = {
  id: string;
  kind: PersonKind;
  full_name: string;
  display_mode: DisplayMode;
  city: string | null;
  mouqaddam_id: string | null;
  biography_slug: string | null;
  birth_date: string | null;
  death_date: string | null;
  birth_city: string | null;
  birth_country: string | null;
  death_city: string | null;
  death_country: string | null;
  zawiya: string | null;
  nicknames: string | null;
  qutb: string | null;
  prophet_family: string | null;
  hidden: number;
  image_version?: string | null;
};

type BiographyRow = {
  slug: string;
  name: string;
  summary: string;
  body: string;
  sources: string;
  draft: number;
  cover: string | null;
};

async function seed(driver: SqlDriver) {
  for (const row of seedPersons) {
    await driver.run("insert into persons (id, kind, full_name, mouqaddam_id, biography_slug) values (?, ?, ?, ?, ?)", [
      row.id,
      row.kind,
      row.fullName,
      row.mouqaddamId,
      row.biographySlug,
    ]);
  }
  for (const row of seedBiographies) {
    await driver.run("insert into biographies (slug, name, period, summary, body, draft) values (?, ?, ?, ?, ?, ?)", [
      row.slug,
      row.name,
      row.period,
      row.summary,
      row.paragraphs.join("\n\n"),
      row.draft ? 1 : 0,
    ]);
  }
}

// Règle de l'application : tout cheikh et tout mouqaddam a sa page de biographie.
// Ne crée que ce qui manque, et ne touche jamais à un texte existant.
async function addMissingBiographies(driver: SqlDriver) {
  const persons = await driver.all<PersonRow>(
    `select * from persons
     where kind in ('cheikh', 'mouqaddam') and hidden = 0 and deleted = 0 and biography_slug is null`,
  );
  for (const person of persons) {
    const base = slugify(person.full_name);
    let slug = base;
    for (let index = 2; await driver.get("select 1 from biographies where slug = ?", [slug]); index++) {
      slug = `${base}-${index}`;
    }
    await driver.run("insert into biographies (slug, name) values (?, ?)", [slug, person.full_name]);
    await driver.run("update persons set biography_slug = ? where id = ?", [slug, person.id]);
  }
}

function detailValues(input: NewMouqaddam): SqlValue[] {
  return [
    input.mouqaddamId,
    input.birthDate,
    input.deathDate,
    input.birthCity,
    input.birthCountry,
    input.deathCity,
    input.deathCountry,
    input.zawiya,
    input.nicknames.join("\n") || null,
    input.qutb ? "1" : null,
    input.prophetFamily ? "1" : null,
    input.biographySlug,
  ];
}

function toBiography(row: BiographyRow): Biography {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    body: row.body,
    sources: row.sources
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    draft: row.draft === 1,
    cover: row.cover,
  };
}

export type SqlStoreOptions = {
  // Première ouverture d'une base vide : faut-il y mettre les personnes et biographies de départ ?
  // Oui sur le Mac ; non sur l'iPhone, qui reçoit tout du Mac à l'appairage.
  seedWhenEmpty: boolean;
};

export function createSqlStore(open: () => SqlDriver, { seedWhenEmpty }: SqlStoreOptions) {
  let ready: Promise<SqlDriver> | null = null;

  const db = () =>
    (ready ??= (async () => {
      const driver = open();
      await driver.exec("pragma foreign_keys = on;");
      await driver.exec(SCHEMA);
      await addMissingColumns(driver);
      await prepareSync(driver);
      const empty = await driver.get<{ count: number }>("select count(*) as count from persons");
      if (seedWhenEmpty && empty?.count === 0) await seed(driver);
      await addMissingBiographies(driver);
      return driver;
    })());

  const all = async <T>(sql: string, params?: SqlValue[]) => (await db()).all<T>(sql, params);
  const get = async <T>(sql: string, params?: SqlValue[]) => (await db()).get<T>(sql, params);
  const run = async (sql: string, params?: SqlValue[]) => (await db()).run(sql, params);

  async function findPerson(id: string) {
    const row = await get<PersonRow>("select * from persons where id = ? and deleted = 0", [id]);
    if (!row) throw new Error("Personne introuvable.");
    return row;
  }

  async function assertLink(person: { id: string; kind: PersonKind }, mouqaddamId: string | null) {
    if (!mouqaddamId) return;
    const target = await findPerson(mouqaddamId);
    if (target.kind === "member") throw new Error("Le mouqaddam choisi ne fait pas partie de la liste.");
    if (target.kind === "prophet" && person.kind !== "cheikh") {
      throw new Error("Seul un cheikh peut être rattaché directement au Prophète.");
    }
    for (let cursor: string | null = mouqaddamId; cursor; cursor = (await findPerson(cursor)).mouqaddam_id) {
      if (cursor === person.id) throw new Error("Ce rattachement créerait une boucle dans la chaîne.");
    }
  }

  // Une biographie ne décrit qu'une personne : la donner à l'une la retire à l'autre.
  const releaseBiography = (slug: string) =>
    run("update persons set biography_slug = null where biography_slug = ?", [slug]);

  async function writeGroup(userId: string, group: LitanyGroup) {
    const row = groupRow(userId, group);
    await run(
      `insert into litanies
         (user_id, id, name, arabic, anchor, offset_minutes, fixed_time, count, days, note, position, items, color, follows)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (user_id, id) do update set
         name = excluded.name, arabic = excluded.arabic, anchor = excluded.anchor,
         offset_minutes = excluded.offset_minutes, fixed_time = excluded.fixed_time, count = excluded.count,
         days = excluded.days, note = excluded.note, position = excluded.position, items = excluded.items,
         color = excluded.color, follows = excluded.follows, deleted = 0`,
      [
        row.user_id,
        row.id,
        row.name,
        row.arabic,
        row.anchor,
        row.offset_minutes,
        row.fixed_time,
        row.count,
        row.days,
        row.note,
        row.position,
        row.items,
        row.color,
        row.follows,
      ],
    );
  }

  const store: Store & { driver: () => Promise<SqlDriver> } = {
    driver: db,

    async listPersons() {
      const rows = await all<PersonRow>(
        `select persons.*, person_images.updated_at as image_version
         from persons left join person_images
           on person_images.person_id = persons.id and person_images.deleted = 0
         where hidden = 0 and persons.deleted = 0`,
      );
      // Chaînes argentées : seulement vers des maîtres visibles, et pas pour une personne en affichage court.
      const visible = new Set(rows.map((row) => row.id));
      const links = await all<{ person_id: string; master_id: string }>(
        "select person_id, master_id from person_links where deleted = 0 order by created_at",
      );
      const alsoFrom = new Map<string, string[]>();
      for (const link of links) {
        if (!visible.has(link.master_id)) continue;
        alsoFrom.set(link.person_id, [...(alsoFrom.get(link.person_id) ?? []), link.master_id]);
      }
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        alsoFrom: row.display_mode === "short" ? [] : (alsoFrom.get(row.id) ?? []).filter((id) => id !== row.mouqaddam_id),
        displayName: row.display_mode === "short" ? shortName(row.full_name) : row.full_name,
        city: row.display_mode === "short" ? null : row.city,
        mouqaddamId: row.mouqaddam_id,
        biographySlug: row.biography_slug,
        birthDate: row.display_mode === "short" ? null : row.birth_date,
        deathDate: row.display_mode === "short" ? null : row.death_date,
        birthCity: row.display_mode === "short" ? null : row.birth_city,
        birthCountry: row.display_mode === "short" ? null : row.birth_country,
        deathCity: row.display_mode === "short" ? null : row.death_city,
        deathCountry: row.display_mode === "short" ? null : row.death_country,
        zawiya: row.display_mode === "short" ? null : row.zawiya,
        nicknames: row.display_mode === "short" ? [] : (row.nicknames?.split("\n") ?? []),
        qutb: row.qutb === "1",
        prophetFamily: row.prophet_family === "1",
        hasImage: row.display_mode !== "short" && Boolean(row.image_version),
        imageVersion: row.image_version,
      }));
    },

    async getSession() {
      const row = await get<PersonRow>("select * from persons where user_id = ? and deleted = 0", [LOCAL_USER]);
      return {
        userId: LOCAL_USER,
        email: "",
        isAdmin: true,
        local: true,
        profile: row
          ? {
              id: row.id,
              fullName: row.full_name,
              displayMode: row.display_mode,
              city: row.city,
              mouqaddamId: row.mouqaddam_id,
            }
          : null,
      };
    },

    async signIn() {
      return "signed-in";
    },

    async signOut() {},

    async saveProfile(userId, input) {
      const existing = await get<PersonRow>("select * from persons where user_id = ? and deleted = 0", [userId]);
      const id = existing?.id ?? crypto.randomUUID();
      await assertLink({ id, kind: existing?.kind ?? "member" }, input.mouqaddamId);
      if (existing) {
        await run("update persons set full_name = ?, display_mode = ?, city = ?, mouqaddam_id = ? where id = ?", [
          input.fullName,
          input.displayMode,
          input.city,
          input.mouqaddamId,
          id,
        ]);
        return;
      }
      await run(
        "insert into persons (id, full_name, display_mode, city, mouqaddam_id, user_id) values (?, ?, ?, ?, ?, ?)",
        [id, input.fullName, input.displayMode, input.city, input.mouqaddamId, userId],
      );
    },

    // Demandes et signalements n'ont pas d'objet avec un seul utilisateur.
    async requestMouqaddam() {},
    async reportPerson() {},
    async listRequests() {
      return [];
    },
    async listReports() {
      return [];
    },
    async resolveRequest() {},
    async closeReport() {},

    async addMouqaddam(input) {
      const id = crypto.randomUUID();
      await assertLink({ id, kind: input.kind }, input.mouqaddamId);
      if (input.biographySlug) await releaseBiography(input.biographySlug);
      await run(
        `insert into persons
           (id, kind, full_name, mouqaddam_id, birth_date, death_date, birth_city, birth_country,
            death_city, death_country, zawiya, nicknames, qutb, prophet_family, biography_slug)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.kind, input.name, ...detailValues(input)],
      );
      return id;
    },

    async updateMouqaddam(personId, input) {
      await assertLink({ id: personId, kind: input.kind }, input.mouqaddamId);
      if (input.biographySlug) await releaseBiography(input.biographySlug);
      await run(
        `update persons set
           kind = ?, full_name = ?, mouqaddam_id = ?, birth_date = ?, death_date = ?, birth_city = ?,
           birth_country = ?, death_city = ?, death_country = ?, zawiya = ?, nicknames = ?, qutb = ?,
           prophet_family = ?, biography_slug = ?
         where id = ?`,
        [input.kind, input.name, ...detailValues(input), personId],
      );
    },

    async deleteMouqaddam(personId) {
      // Suppression douce : les disciples sont détachés, l'image retirée, la biographie et le compte libérés.
      await (
        await db()
      ).transaction(async () => {
        await run("update persons set mouqaddam_id = null where mouqaddam_id = ?", [personId]);
        await run("update person_images set deleted = 1 where person_id = ?", [personId]);
        await run("update persons set deleted = 1, biography_slug = null, user_id = null where id = ?", [personId]);
        await run("update person_links set deleted = 1 where (person_id = ? or master_id = ?) and deleted = 0", [
          personId,
          personId,
        ]);
      });
    },

    async setPersonImage(personId, base64) {
      if (!base64) {
        await run("update person_images set deleted = 1 where person_id = ?", [personId]);
        return;
      }
      await run(
        `insert into person_images (person_id, data, updated_at) values (?, ?, ?)
         on conflict (person_id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted = 0`,
        [personId, fromBase64(base64), new Date().toISOString()],
      );
    },

    async getPersonImage(personId) {
      const row = await get<{ data: Uint8Array }>(
        `select data from person_images
         join persons on persons.id = person_images.person_id
         where person_id = ? and person_images.deleted = 0 and persons.deleted = 0
           and hidden = 0 and display_mode <> 'short'`,
        [personId],
      );
      return row ? new Uint8Array(row.data) : null;
    },

    async listPortraits() {
      const rows = await all<{ person_id: string }>(
        `select person_id from person_images as image
         join persons on persons.id = image.person_id
         where image.deleted = 0 and persons.deleted = 0 and hidden = 0 and display_mode <> 'short'
           and (select count(*) from person_images as other where other.deleted = 0 and other.data = image.data) = 1`,
      );
      return rows.map((row) => row.person_id);
    },

    async linkMouqaddam(personId, mouqaddamId) {
      await assertLink(await findPerson(personId), mouqaddamId);
      await run("update persons set mouqaddam_id = ? where id = ?", [mouqaddamId, personId]);
    },

    async setPlace(personId, kind, city, country) {
      await findPerson(personId);
      const [cityColumn, countryColumn] = kind === "birth" ? ["birth_city", "birth_country"] : ["death_city", "death_country"];
      await run(`update persons set ${cityColumn} = ?, ${countryColumn} = ? where id = ?`, [city, country, personId]);
    },

    async setAlsoFrom(personId, masterIds) {
      const person = await findPerson(personId);
      const wanted = new Set(masterIds.filter((id) => id && id !== personId && id !== person.mouqaddam_id));
      const current = await all<{ id: string; master_id: string; deleted: number }>(
        "select id, master_id, deleted from person_links where person_id = ?",
        [personId],
      );
      await (
        await db()
      ).transaction(async () => {
        for (const link of current) {
          const keep = wanted.has(link.master_id);
          if (keep && link.deleted) await run("update person_links set deleted = 0 where id = ?", [link.id]);
          if (!keep && !link.deleted) await run("update person_links set deleted = 1 where id = ?", [link.id]);
          wanted.delete(link.master_id);
        }
        for (const masterId of wanted) {
          await findPerson(masterId);
          await run("insert into person_links (id, person_id, master_id) values (?, ?, ?)", [
            crypto.randomUUID(),
            personId,
            masterId,
          ]);
        }
      });
    },

    async setHidden(personId, hidden) {
      await run("update persons set hidden = ? where id = ?", [hidden ? 1 : 0, personId]);
    },

    async listBiographies() {
      const rows = await all<BiographyRow>("select * from biographies where deleted = 0 order by name collate nocase");
      return rows.map(toBiography);
    },

    async getBiography(slug) {
      const row = await get<BiographyRow>("select * from biographies where slug = ? and deleted = 0", [slug]);
      return row ? toBiography(row) : null;
    },

    async saveBiography({ slug, name, summary, body, sources, draft, cover, personId }) {
      await run(
        `insert into biographies (slug, name, summary, body, sources, draft, cover)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict (slug) do update set
           name = excluded.name, summary = excluded.summary,
           body = excluded.body, sources = excluded.sources, draft = excluded.draft,
           cover = excluded.cover, updated_at = datetime('now'), deleted = 0`,
        [slug, name, summary, body, sources, draft ? 1 : 0, cover],
      );
      await releaseBiography(slug);
      if (personId) await run("update persons set biography_slug = ? where id = ?", [slug, personId]);
    },

    async setBiographyCover(slug, cover) {
      await run("update biographies set cover = ? where slug = ?", [cover, slug]);
    },

    async deleteBiography(slug) {
      await releaseBiography(slug);
      await run("update biographies set deleted = 1 where slug = ?", [slug]);
    },

    async getSulukSettings(userId) {
      const row = await get<{ city: string; latitude: number; longitude: number; method: PrayerMethod; timezone: string }>(
        "select * from suluk_settings where user_id = ? and deleted = 0",
        [userId],
      );
      return row
        ? { city: row.city, latitude: row.latitude, longitude: row.longitude, method: row.method, timezone: row.timezone }
        : null;
    },

    async initSuluk(userId, settings, groups) {
      await this.saveSulukSettings(userId, settings);
      for (const group of groups) await writeGroup(userId, group);
    },

    async saveSulukSettings(userId, { city, latitude, longitude, method, timezone }) {
      await run(
        `insert into suluk_settings (user_id, city, latitude, longitude, method, timezone) values (?, ?, ?, ?, ?, ?)
         on conflict (user_id) do update set
           city = excluded.city, latitude = excluded.latitude, longitude = excluded.longitude,
           method = excluded.method, timezone = excluded.timezone, deleted = 0`,
        [userId, city, latitude, longitude, method, timezone],
      );
    },

    async listGroups(userId) {
      const rows = await all<GroupRow>(
        "select * from litanies where user_id = ? and deleted = 0 order by position, name",
        [userId],
      );
      return rows.map(toGroup);
    },

    async saveGroup(userId, group) {
      await writeGroup(userId, group);
    },

    async deleteGroup(userId, id) {
      await run("update litanies set deleted = 1 where user_id = ? and id = ?", [userId, id]);
      // La séance et chacune de ses litanies cochées à part (« séance#nom »).
      await run(
        "update wird_log set deleted = 1 where user_id = ? and (practice = ? or practice like ? escape '\\') and deleted = 0",
        [userId, id, `${id.replace(/[\\%_]/g, "\\$&")}#%`],
      );
    },

    async listExercises(userId) {
      const rows = await all<{
        id: string;
        pillar: ExerciseKind;
        days: string;
        start_time: string | null;
        end_time: string | null;
        note: string | null;
        position: number;
      }>("select * from abdal where user_id = ? and deleted = 0 order by position", [userId]);
      return rows.map((row) => ({
        id: row.id,
        kind: row.pillar,
        note: row.note,
        days: [...row.days].map(Number),
        start: row.start_time,
        end: row.end_time,
        position: row.position,
      }));
    },

    async saveExercise(userId, { id, kind, days, start, end, note, position }) {
      await run(
        `insert into abdal (user_id, id, pillar, days, start_time, end_time, note, position) values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (user_id, id) do update set
           pillar = excluded.pillar, days = excluded.days, start_time = excluded.start_time,
           end_time = excluded.end_time, note = excluded.note, position = excluded.position, deleted = 0`,
        [userId, id, kind, days.join(""), start, end, note, position],
      );
    },

    async listJournal(userId, from, to) {
      return all<JournalEntry>(
        "select day, key, text from suluk_journal where user_id = ? and day between ? and ? and deleted = 0",
        [userId, from, to],
      );
    },

    async saveJournal(userId, day, key, text) {
      if (!text) {
        await run("update suluk_journal set deleted = 1 where user_id = ? and day = ? and key = ? and deleted = 0", [
          userId,
          day,
          key,
        ]);
        return;
      }
      await run(
        `insert into suluk_journal (user_id, day, key, text) values (?, ?, ?, ?)
         on conflict (user_id, day, key) do update set text = excluded.text, deleted = 0`,
        [userId, day, key, text],
      );
    },

    async deleteExercise(userId, id) {
      await run("update abdal set deleted = 1 where user_id = ? and id = ?", [userId, id]);
      await run("update wird_log set deleted = 1 where user_id = ? and practice = ? and deleted = 0", [
        userId,
        `abdal:${id}`,
      ]);
    },

    async listStationStates(userId) {
      return all<StationState>(
        "select station, degree, note, explanation from stations where user_id = ? and deleted = 0",
        [userId],
      );
    },

    async saveStationState(userId, { station, degree, note, explanation }) {
      const previous = await get<{ degree: number }>(
        "select degree from stations where user_id = ? and station = ? and deleted = 0",
        [userId, station],
      );
      await run(
        `insert into stations (user_id, station, degree, note, explanation, updated_at) values (?, ?, ?, ?, ?, datetime('now'))
         on conflict (user_id, station) do update set
           degree = excluded.degree, note = excluded.note, explanation = excluded.explanation,
           updated_at = excluded.updated_at, deleted = 0`,
        [userId, station, degree, note, explanation],
      );
      if ((previous?.degree ?? 0) !== degree) {
        await run("insert into station_history (id, user_id, station, degree) values (?, ?, ?, ?)", [
          crypto.randomUUID(),
          userId,
          station,
          degree,
        ]);
      }
    },

    async listStationHistory(userId, station) {
      return all<StationChange>(
        `select station, degree, at from station_history
         where user_id = ? and station = ? and deleted = 0 order by at desc, rowid desc`,
        [userId, station],
      );
    },

    async listStationMoments(userId) {
      return all<StationMoment>(
        "select id, station, day, text from station_moments where user_id = ? and deleted = 0 order by day desc",
        [userId],
      );
    },

    async addStationMoment(userId, { id, station, day, text }) {
      await run(
        `insert into station_moments (user_id, id, station, day, text) values (?, ?, ?, ?, ?)
         on conflict (user_id, id) do update set station = excluded.station, day = excluded.day,
           text = excluded.text, deleted = 0`,
        [userId, id, station, day, text],
      );
    },

    async deleteStationMoment(userId, id) {
      await run("update station_moments set deleted = 1 where user_id = ? and id = ?", [userId, id]);
    },

    async getStationFocus(userId) {
      const row = await get<StationFocus>(
        "select station, start, days from station_focus where user_id = ? and deleted = 0",
        [userId],
      );
      return row ?? null;
    },

    async setStationFocus(userId, focus) {
      if (!focus) {
        await run("update station_focus set deleted = 1 where user_id = ? and deleted = 0", [userId]);
        return;
      }
      await run(
        `insert into station_focus (user_id, station, start, days) values (?, ?, ?, ?)
         on conflict (user_id) do update set station = excluded.station, start = excluded.start,
           days = excluded.days, deleted = 0`,
        [userId, focus.station, focus.start, focus.days],
      );
    },

    async listWird(userId, from, to) {
      return all<WirdEntry>(
        `select day, practice as litany from wird_log
         where user_id = ? and day between ? and ? and deleted = 0 order by day`,
        [userId, from, to],
      );
    },

    async setWird(userId, day, litany, done) {
      if (done) {
        await run(
          `insert into wird_log (user_id, day, practice) values (?, ?, ?)
           on conflict (user_id, day, practice) do update set deleted = 0 where wird_log.deleted = 1`,
          [userId, day, litany],
        );
        return;
      }
      await run("update wird_log set deleted = 1 where user_id = ? and day = ? and practice = ? and deleted = 0", [
        userId,
        day,
        litany,
      ]);
    },
  };
  return store;
}
