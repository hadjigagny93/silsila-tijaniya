import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { placeLabel, placeOfPerson, publicPerson } from "@/lib/biographySections";
import { chainOf, generationsOf, isChoosableMouqaddam } from "@/lib/chain";
import { coverStyle, listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import type { PublicPerson } from "@/lib/data/types";
import { periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

type Props = { params: Promise<{ id: string }> };

const m = t.mouqaddams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const persons = await getStore().listPersons();
  return { title: persons.find((person) => person.id === id)?.displayName ?? m.title };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bio-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Le Prophète ﷺ n'a pas de profil ici : son lien mène à l'arbre.
function PersonLink({ someone }: { someone: PublicPerson }) {
  const href = isChoosableMouqaddam(someone) ? `/mouqaddams/${someone.id}` : `/silsila/${someone.id}`;
  return (
    <Link href={href} className="bio-person">
      <Avatar person={publicPerson(someone)} size={36} />
      <span>{someone.displayName}</span>
    </Link>
  );
}

// Profil public d'un cheikh ou d'un mouqaddam : en lecture seule, sans le rang de pôle spirituel.
export default async function MouqaddamProfilePage({ params }: Props) {
  const { id } = await params;
  const store = getStore();
  const [persons, biographies, session] = await Promise.all([
    store.listPersons(),
    store.listBiographies(),
    store.getSession(),
  ]);
  const found = persons.find((candidate) => candidate.id === id);
  if (!found || !isChoosableMouqaddam(found)) notFound();
  const person = publicPerson(found);

  const byId = new Map(persons.map((someone) => [someone.id, someone]));
  const biography = biographies.find((entry) => entry.slug === person.biographySlug && entry.body.trim());
  const covers = listCovers();
  const master = person.mouqaddamId ? byId.get(person.mouqaddamId) : undefined;
  const silver = person.alsoFrom.map((masterId) => byId.get(masterId)).filter(Boolean) as PublicPerson[];
  const disciples = persons
    .filter((candidate) => candidate.mouqaddamId === person.id && isChoosableMouqaddam(candidate))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const { chain, complete } = chainOf(persons, person.id);
  const rank = generationsOf(persons).get(person.id);
  const period = periodOf(person.birthDate, person.deathDate);
  const place = placeOfPerson(person);
  const birth = [person.birthDate, placeLabel(person.birthCity, person.birthCountry)].filter(Boolean).join(" · ");
  const death = [person.deathDate, placeLabel(person.deathCity, person.deathCountry)].filter(Boolean).join(" · ");

  return (
    <article className="bio-article">
      <header className="bio-hero bio-hero-short">
        <div
          className="bio-hero-image"
          style={coverStyle(biography ?? { slug: person.id, cover: null }, covers)}
          aria-hidden
        />
        <div className="bio-hero-content">
          <nav className="bio-crumbs" aria-label={m.title}>
            <Link href="/mouqaddams">{m.title}</Link>
            {rank && (
              <>
                <span aria-hidden>›</span>
                <Link href={`/mouqaddams#generation-${rank}`}>{m.generation(rank)}</Link>
              </>
            )}
          </nav>
          <div className="bio-hero-who">
            <span className="bio-hero-avatar">
              <Avatar person={person} size={104} />
            </span>
            <div>
              <h1>{person.displayName}</h1>
              <p className="bio-hero-meta">
                {[t.kinds[person.kind], period, place].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="bio-layout bio-layout-profile">
        <div className="bio-main">
          <div className="profile-actions">
            {biography && (
              <Link href={`/biographies/${biography.slug}`} className="button">
                <Icon name="book" size={16} />
                {m.biography}
              </Link>
            )}
            <Link href={`/silsila?personne=${person.id}`} className="button-quiet">
              <Icon name="tree" size={16} />
              {m.tree}
            </Link>
          </div>

          <section className="profile-section">
            <h2>{m.chain}</h2>
            <ol className="profile-chain">
              {chain.map((link) => (
                <li key={link.id} aria-current={link.id === person.id ? "true" : undefined}>
                  {link.id === person.id ? (
                    <span className="bio-person">
                      <Avatar person={person} size={36} />
                      <span>{link.displayName}</span>
                    </span>
                  ) : (
                    <PersonLink someone={link} />
                  )}
                </li>
              ))}
            </ol>
            {!complete && <p className="bio-note mt-4">{m.chainIncomplete}</p>}
          </section>

          <section className="profile-section">
            <h2>
              {m.disciples} <small>{disciples.length}</small>
            </h2>
            {disciples.length === 0 ? (
              <p className="mt-3 text-muted">{m.noDisciples}</p>
            ) : (
              <ul className="profile-disciples">
                {disciples.map((disciple) => (
                  <li key={disciple.id}>
                    <PersonLink someone={disciple} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!session?.local && (
            <aside className="contrib-invite">
              <div>
                <h2>{m.contribute}</h2>
                <p>{m.contributeText}</p>
              </div>
              <Link href={`/contribuer/correction?personne=${person.id}`} className="button">
                {m.contributeButton}
              </Link>
            </aside>
          )}
        </div>

        <section className="bio-aside" aria-label={m.facts}>
          <div className="bio-aside-card">
            <h2 className="eyebrow">{m.facts}</h2>
            <dl className="bio-facts">
              <Fact label={m.kind}>{t.kinds[person.kind]}</Fact>
              {person.prophetFamily && <Fact label={m.prophetFamily}>✓</Fact>}
              {person.nicknames.length > 0 && <Fact label={t.biographies.nicknames}>{person.nicknames.join(", ")}</Fact>}
              {birth && <Fact label={t.biographies.birth}>{birth}</Fact>}
              {death && <Fact label={t.biographies.death}>{death}</Fact>}
              {person.zawiya && <Fact label={t.biographies.zawiya}>{person.zawiya}</Fact>}
              {master && (
                <Fact label={m.master}>
                  <PersonLink someone={master} />
                </Fact>
              )}
              {silver.length > 0 && (
                <Fact label={m.alsoFrom}>
                  <ul className="bio-disciples">
                    {silver.map((other) => (
                      <li key={other.id}>
                        <PersonLink someone={other} />
                      </li>
                    ))}
                  </ul>
                </Fact>
              )}
            </dl>
          </div>
        </section>
      </div>

      <p className="bio-back">
        <Link href="/mouqaddams">
          <Icon name="arrowL" size={14} />
          {m.back}
        </Link>
      </p>
    </article>
  );
}
