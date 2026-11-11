import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Icon, Star } from "@/components/Icon";
import { chainOf, generationsOf } from "@/lib/chain";
import { getStore } from "@/lib/data";
import type { PublicPerson } from "@/lib/data/types";
import { placeOf } from "@/lib/places";
import { t } from "@/messages/fr";

// Une vraie chaîne de la base, différente chaque jour : la plus longue possible, avec un visage au bout si on peut.
function chainOfTheDay(persons: PublicPerson[]) {
  const chains = persons
    .filter((person) => person.kind !== "prophet")
    .map((person) => chainOf(persons, person.id))
    .filter((found) => found.complete && found.chain.length >= 5);
  if (chains.length === 0) return null;
  const longest = Math.max(...chains.map((found) => found.chain.length));
  const long = chains.filter((found) => found.chain.length >= longest - 2);
  const withFace = long.filter((found) => found.chain.at(-1)!.hasImage);
  const pool = withFace.length > 0 ? withFace : long;
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[day % pool.length].chain;
}

export default async function Home() {
  const store = getStore();
  const [persons, biographies] = await Promise.all([store.listPersons(), store.listBiographies()]);
  const generations = generationsOf(persons);
  const chain = chainOfTheDay(persons);
  const places = new Set(persons.map((person) => placeOf(person)?.name).filter(Boolean));
  const bySlug = new Set(biographies.map((biography) => biography.slug));
  const cheikhs = persons
    .filter(
      (person) =>
        person.kind === "cheikh" && person.hasImage && person.biographySlug && bySlug.has(person.biographySlug),
    )
    .sort((a, b) => (generations.get(a.id) ?? 99) - (generations.get(b.id) ?? 99))
    .slice(0, 8);

  const stats = [
    [persons.length, t.home.stats.persons],
    [new Set(generations.values()).size, t.home.stats.generations],
    [biographies.length, t.home.stats.biographies],
    [places.size, t.home.stats.places],
  ] as const;

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <p className="home-arabic" lang="ar" dir="rtl">
              {t.home.arabic}
            </p>
            <h1 className="home-title">{t.home.title}</h1>
            <p className="home-intro">{t.home.intro}</p>
            <div className="home-actions">
              <Link href="/silsila" className="button home-primary">
                <Icon name="tree" size={18} />
                {t.home.explore}
              </Link>
              <Link href="/biographies" className="button home-secondary">
                <Icon name="book" size={18} />
                {t.home.read}
              </Link>
            </div>
          </div>

          {chain && (
            <figure className="home-chain">
              <figcaption className="label">{t.home.chainLabel}</figcaption>
              <ol>
                {chain.map((person, index) => (
                  <li key={person.id} data-end={index === 0 || index === chain.length - 1 || undefined}>
                    <span className="home-chain-dot" aria-hidden>
                      {index === 0 ? <Star size={14} /> : null}
                    </span>
                    {index > 0 && <Avatar person={person} size={index === chain.length - 1 ? 34 : 24} />}
                    <Link href={`/silsila?personne=${person.id}`}>{person.displayName}</Link>
                  </li>
                ))}
              </ol>
              <p className="home-chain-foot">{t.home.chainFoot(chain.length)}</p>
            </figure>
          )}
        </div>
      </section>

      <dl className="home-stats">
        {stats.map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {cheikhs.length > 0 && (
        <section className="home-cheikhs">
          <p className="label text-center">{t.home.cheikhsLabel}</p>
          <h2 className="mt-2 text-center text-[32px]">{t.home.cheikhsTitle}</h2>
          <ul>
            {cheikhs.map((person) => (
              <li key={person.id}>
                <Link href={`/biographies/${person.biographySlug}`}>
                  <Avatar person={person} size={96} />
                  <span>{person.displayName}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-center">
            <Link href="/biographies" className="home-more">
              {t.home.allBiographies}
              <Icon name="arrowR" size={16} />
            </Link>
          </p>
        </section>
      )}

      <div className="pattern-band home-band" aria-hidden />

      <div className="card-grid home-cards">
        <Link href="/silsila" className="group block">
          <p className="label">{t.home.silsilaLabel}</p>
          <h2 className="mt-2 group-hover:text-accent">{t.home.silsilaTitle}</h2>
          <p className="mt-2 text-muted">{t.home.silsilaText}</p>
        </Link>
        <Link href="/biographies" className="group block">
          <p className="label">{t.home.biographiesLabel}</p>
          <h2 className="mt-2 group-hover:text-accent">{t.home.biographiesTitle}</h2>
          <p className="mt-2 text-muted">{t.home.biographiesText}</p>
        </Link>
      </div>
    </>
  );
}
