// Publication de la base du Mac (la référence) vers Supabase : silsila, photos, biographies, chaînes argentées.
// Le site reçoit une copie ; les comptes inscrits en ligne et le Sulûk de chacun ne sont pas touchés.
// Partagé par `npm run publier` et le bouton « Publier sur le site » de l'app Mac : pas d'alias « @/ » ici.
import type { SupabaseClient } from "@supabase/supabase-js";

type Rows = <T>(sql: string) => Promise<T[]>;

type PersonRow = {
  id: string;
  kind: string;
  full_name: string;
  display_mode: string;
  city: string | null;
  mouqaddam_id: string | null;
  biography_slug: string | null;
  hidden: number;
  created_at: string;
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
};

// Une biographie part sur le site si elle a un texte et n'est pas gardée sur le Mac.
const PUBLISHABLE = "deleted = 0 and coalesce(local_only, 0) = 0 and length(trim(body)) > 0";

type BiographyRow = {
  slug: string;
  name: string;
  period: string;
  summary: string;
  body: string;
  sources: string;
  draft: number;
  cover: string | null;
  updated_at: string;
};

export type PublishCounts = { persons: number; images: number; biographies: number; links: number };
export type PublishResult = PublishCounts & {
  removed: { persons: number; images: number; biographies: number };
};

// Lit la base locale et prépare les lignes telles que Supabase les attend.
export async function collect(rows: Rows) {
  const biographies = (await rows<BiographyRow>(`select * from biographies where ${PUBLISHABLE}`)).map((row) => ({
    slug: row.slug,
    name: row.name,
    period: row.period,
    summary: row.summary,
    body: row.body,
    sources: row.sources,
    draft: row.draft === 1,
    cover: row.cover,
    updated_at: row.updated_at,
  }));
  const slugs = new Set(biographies.map((row) => row.slug));

  const local = await rows<PersonRow>("select * from persons where deleted = 0");
  const ids = new Set(local.map((row) => row.id));
  // Parents avant enfants : la base vérifie que chaque maître existe déjà.
  const byId = new Map(local.map((row) => [row.id, row]));
  const depth = new Map<string, number>();
  const depthOf = (row: PersonRow, seen = new Set<string>()): number => {
    const known = depth.get(row.id);
    if (known !== undefined) return known;
    const parent = row.mouqaddam_id ? byId.get(row.mouqaddam_id) : undefined;
    const value = parent && !seen.has(parent.id) ? depthOf(parent, seen.add(row.id)) + 1 : 0;
    depth.set(row.id, value);
    return value;
  };
  const persons = [...local]
    .sort((a, b) => depthOf(a) - depthOf(b))
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      full_name: row.full_name,
      display_mode: row.display_mode,
      city: row.city,
      mouqaddam_id: row.mouqaddam_id && ids.has(row.mouqaddam_id) ? row.mouqaddam_id : null,
      biography_slug: row.biography_slug && slugs.has(row.biography_slug) ? row.biography_slug : null,
      hidden: row.hidden === 1,
      created_at: row.created_at,
      birth_date: row.birth_date,
      death_date: row.death_date,
      birth_city: row.birth_city,
      birth_country: row.birth_country,
      death_city: row.death_city,
      death_country: row.death_country,
      zawiya: row.zawiya,
      nicknames: row.nicknames,
      qutb: row.qutb === "1",
      prophet_family: row.prophet_family === "1",
      // Pas de user_id : les comptes du Mac ne sont pas ceux du site.
    }));

  const images = (
    await rows<{ person_id: string; data: Uint8Array; updated_at: string }>(
      "select person_id, data, updated_at from person_images where deleted = 0",
    )
  )
    .filter((row) => ids.has(row.person_id))
    .map((row) => ({
      person_id: row.person_id,
      data: Buffer.from(row.data).toString("base64"),
      updated_at: row.updated_at,
    }));

  const pairs = new Set<string>();
  const links = (
    await rows<{ id: string; person_id: string; master_id: string; created_at: string }>(
      "select * from person_links where deleted = 0 order by created_at",
    )
  )
    .filter((row) => ids.has(row.person_id) && ids.has(row.master_id) && row.person_id !== row.master_id)
    .filter((row) => {
      const pair = `${row.person_id}>${row.master_id}`;
      if (pairs.has(pair)) return false;
      pairs.add(pair);
      return true;
    })
    .map((row) => ({ id: row.id, person_id: row.person_id, master_id: row.master_id, created_at: row.created_at }));

  return { biographies, slugs, persons, ids, images, links };
}

export const countsOf = (data: Awaited<ReturnType<typeof collect>>): PublishCounts => ({
  persons: data.persons.length,
  images: data.images.length,
  biographies: data.biographies.length,
  links: data.links.length,
});

const chunks = <T>(list: T[], size: number) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export async function publish(rows: Rows, supabase: SupabaseClient): Promise<PublishResult> {
  const data = await collect(rows);
  const { biographies, slugs, persons, ids, images, links } = data;
  const check = ({ error }: { error: { message: string } | null }, step: string) => {
    if (error) throw new Error(`${step} : ${error.message}`);
  };
  const online = async <T>(table: string, column: string) => {
    const values: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase
        .from(table)
        .select(column)
        .range(from, from + 999);
      if (error) throw new Error(`${table} : ${error.message}`);
      values.push(...(page as T[]));
      if (page.length < 1000) return values;
    }
  };

  for (const part of chunks(biographies, 50)) check(await supabase.from("biographies").upsert(part), "Biographies");

  // Une biographie ne va qu'à une personne : on libère toutes les attributions avant de les reposer.
  check(
    await supabase.from("persons").update({ biography_slug: null }).not("biography_slug", "is", null),
    "Biographies des personnes",
  );
  for (const part of chunks(persons, 100)) check(await supabase.from("persons").upsert(part), "Personnes");

  // Retirées sur le Mac : effacées en ligne. Les fiches des membres inscrits sur le site restent.
  const extra = (await online<{ id: string; user_id: string | null }>("persons", "id, user_id")).filter(
    (row) => !ids.has(row.id) && !row.user_id,
  );
  for (const part of chunks(
    extra.map((row) => row.id),
    100,
  )) {
    check(await supabase.from("persons").delete().in("id", part), "Personnes retirées");
  }

  for (const part of chunks(images, 10)) check(await supabase.from("person_images").upsert(part), "Photos");
  const withImage = new Set(images.map((row) => row.person_id));
  const staleImages = (await online<{ person_id: string }>("person_images", "person_id")).filter(
    (row) => ids.has(row.person_id) && !withImage.has(row.person_id),
  );
  for (const part of chunks(
    staleImages.map((row) => row.person_id),
    100,
  )) {
    check(await supabase.from("person_images").delete().in("person_id", part), "Photos retirées");
  }

  check(await supabase.from("person_links").delete().not("id", "is", null), "Chaînes argentées");
  for (const part of chunks(links, 200)) check(await supabase.from("person_links").insert(part), "Chaînes argentées");

  const staleBiographies = (await online<{ slug: string }>("biographies", "slug")).filter(
    (row) => !slugs.has(row.slug),
  );
  for (const part of chunks(
    staleBiographies.map((row) => row.slug),
    100,
  )) {
    check(await supabase.from("biographies").delete().in("slug", part), "Biographies retirées");
  }

  return {
    ...countsOf(data),
    removed: { persons: extra.length, images: staleImages.length, biographies: staleBiographies.length },
  };
}
