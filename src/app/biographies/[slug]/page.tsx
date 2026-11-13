import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CoverChanger } from "@/components/CoverChanger";
import { Icon } from "@/components/Icon";
import { MarkdownText } from "@/components/MarkdownText";
import { isChoosableMouqaddam } from "@/lib/chain";
import { biographySections, placeLabel, readingMinutes } from "@/lib/biographySections";
import { coverStyle, listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

type Props = { params: Promise<{ slug: string }> };

const b = t.biographies;
const DISCIPLES_SHOWN = 8;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const biography = await getStore().getBiography(slug);
  return { title: biography?.name, description: biography?.summary };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bio-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PersonLink({ person, biography }: { person: PublicPerson; biography?: Biography }) {
  return (
    <Link href={biography ? `/biographies/${biography.slug}` : `/silsila/${person.id}`} className="bio-person">
      <Avatar person={person} size={36} />
      <span>{person.displayName}</span>
    </Link>
  );
}

export default async function BiographyPage({ params }: Props) {
  const { slug } = await params;
  const store = getStore();
  const biography = await store.getBiography(slug);
  if (!biography) notFound();

  const [persons, biographies, session] = await Promise.all([
    store.listPersons(),
    store.listBiographies(),
    store.getSession(),
  ]);
  const person = persons.find((candidate) => candidate.biographySlug === slug);
  const covers = listCovers();
  const hasText = Boolean(biography.body.trim());
  const period = person ? periodOf(person.birthDate, person.deathDate) : "";
  // Le profil complet se trouve dans l'administration ; le public voit la fiche de la silsila.
  const profile =
    person &&
    (session?.isAdmin
      ? `/admin/mouqaddams/${person.id}`
      : isChoosableMouqaddam(person)
        ? `/mouqaddams/${person.id}`
        : `/silsila/${person.id}`);

  // Les liens ne mènent qu'aux biographies visibles ici (sur le site : publiées).
  const bySlug = new Map(biographies.map((entry) => [entry.slug, entry]));
  const biographyOf = (someone: PublicPerson) => (someone.biographySlug ? bySlug.get(someone.biographySlug) : undefined);
  const master = person?.mouqaddamId ? persons.find((candidate) => candidate.id === person.mouqaddamId) : undefined;
  const wirdFrom = person?.wirdFromId ? persons.find((candidate) => candidate.id === person.wirdFromId) : undefined;
  const disciples = person
    ? persons
        .filter((candidate) => candidate.mouqaddamId === person.id && biographyOf(candidate))
        .sort((x, y) => x.displayName.localeCompare(y.displayName, "fr"))
    : [];

  // Précédente et suivante, dans l'ordre de la liste des biographies.
  const sections = biographySections(biographies, persons);
  const ordered = sections.flatMap((section) => section.biographies.map((entry) => ({ entry, section })));
  const index = ordered.findIndex(({ entry }) => entry.slug === slug);
  const section = index >= 0 ? ordered[index].section : undefined;
  const previous = index > 0 ? ordered[index - 1].entry : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1].entry : undefined;
  const ownerOf = new Map(persons.map((someone) => [someone.biographySlug, someone]));

  const birth = person && [person.birthDate, placeLabel(person.birthCity, person.birthCountry)].filter(Boolean).join(" · ");
  const death = person && [person.deathDate, placeLabel(person.deathCity, person.deathCountry)].filter(Boolean).join(" · ");

  return (
    <article className="bio-article">
      <header className="bio-hero">
        <div className="bio-hero-image" style={coverStyle(biography, covers)} aria-hidden />
        {session?.isAdmin && covers.length > 0 && <CoverChanger biography={biography} covers={covers} />}
        <div className="bio-hero-content">
          <nav className="bio-crumbs" aria-label={b.title}>
            <Link href="/biographies">{b.title}</Link>
            {section && (
              <>
                <span aria-hidden>›</span>
                <Link href={`/biographies#${section.id}`}>{section.title}</Link>
              </>
            )}
          </nav>
          <div className="bio-hero-who">
            {person && (
              <Link href={profile!} aria-label={b.profile} className="bio-hero-avatar">
                <Avatar person={person} size={104} />
              </Link>
            )}
            <div>
              <h1>{biography.name}</h1>
              <p className="bio-hero-meta">
                {[period, hasText && b.readingTime(readingMinutes(biography.body))].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="bio-layout">
        <div className="bio-main">
          {/* « Brouillon » : une note de travail pour l'admin, pas pour les visiteurs. */}
          {session?.isAdmin && biography.draft && hasText && <p className="bio-note">{b.draft}</p>}

          {biography.summary && hasText && <p className="bio-lead">{biography.summary}</p>}

          {!hasText && (
            <div className="bio-empty">
              <p>{b.empty_text}</p>
              {session?.isAdmin && (
                <Link href={`/biographies/${slug}/modifier`} className="button mt-3">
                  {b.write}
                </Link>
              )}
            </div>
          )}

          {hasText && (
            <div className="bio-body">
              <MarkdownText>{biography.body}</MarkdownText>
            </div>
          )}

          {biography.sources.length > 0 && (
            <section className="bio-sources">
              <h2>
                {b.sources} <small>{b.sourcesCount(biography.sources.length)}</small>
              </h2>
              <ol>
                {biography.sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ol>
            </section>
          )}

          {!session?.local && person && (
            <aside className="contrib-invite">
              <div>
                <h2>{t.contribute.bioCta}</h2>
                <p>{t.contribute.bioCtaText}</p>
              </div>
              <Link href={`/contribuer/biographie?personne=${person.id}`} className="button">
                {t.contribute.bioCtaButton}
              </Link>
            </aside>
          )}
        </div>

        <section className="bio-aside" aria-label={b.facts}>
          <div className="bio-aside-card">
            <h2 className="eyebrow">{b.facts}</h2>
            <dl className="bio-facts">
              {birth && <Fact label={b.birth}>{birth}</Fact>}
              {death && <Fact label={b.death}>{death}</Fact>}
              {person?.zawiya && <Fact label={b.zawiya}>{person.zawiya}</Fact>}
              {person && person.nicknames.length > 0 && <Fact label={b.nicknames}>{person.nicknames.join(", ")}</Fact>}
              {wirdFrom && (
                <Fact label={t.mouqaddams.wirdFrom}>
                  <PersonLink person={wirdFrom} biography={biographyOf(wirdFrom)} />
                </Fact>
              )}
              {master && (
                <Fact label={b.master}>
                  <PersonLink person={master} biography={biographyOf(master)} />
                </Fact>
              )}
              {disciples.length > 0 && (
                <Fact label={`${b.disciples} (${disciples.length})`}>
                  <ul className="bio-disciples">
                    {disciples.slice(0, DISCIPLES_SHOWN).map((disciple) => (
                      <li key={disciple.id}>
                        <PersonLink person={disciple} biography={biographyOf(disciple)} />
                      </li>
                    ))}
                  </ul>
                  {disciples.length > DISCIPLES_SHOWN && (
                    <Link href="/biographies#generation-1" className="bio-more">
                      {b.moreDisciples(disciples.length - DISCIPLES_SHOWN)} →
                    </Link>
                  )}
                </Fact>
              )}
            </dl>
            <div className="bio-aside-links">
              {person && (
                <Link href={`/silsila/${person.id}`} className="button">
                  <Icon name="tree" size={16} />
                  {b.chain}
                </Link>
              )}
              {session?.isAdmin && (
                <Link href={`/biographies/${slug}/modifier`} className="button-quiet">
                  <Icon name="edit" size={16} />
                  {b.edit}
                </Link>
              )}
              {session?.isAdmin && profile && (
                <Link href={profile} className="button-quiet">
                  <Icon name="user" size={16} />
                  {b.profile}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {(previous || next) && (
        <nav className="bio-pager" aria-label={b.title}>
          {[
            { entry: previous, label: b.previous, rel: "prev" },
            { entry: next, label: b.next, rel: "next" },
          ].map(({ entry, label, rel }) => {
            if (!entry) return <span key={rel} />;
            const owner = ownerOf.get(entry.slug);
            return (
              <Link key={rel} href={`/biographies/${entry.slug}`} rel={rel} className={`bio-pager-link is-${rel}`}>
                <span className="bio-pager-label">
                  {rel === "prev" && <Icon name="arrowL" size={14} />}
                  {label}
                  {rel === "next" && <Icon name="arrowR" size={14} />}
                </span>
                <span className="bio-pager-who">
                  {owner && <Avatar person={owner} size={40} />}
                  <span>{entry.name}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <p className="bio-back">
        <Link href="/biographies">
          <Icon name="arrowL" size={14} />
          {b.back}
        </Link>
      </p>
    </article>
  );
}
