import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CoverChanger } from "@/components/CoverChanger";
import { MarkdownText } from "@/components/MarkdownText";
import { coverStyle, listCovers } from "@/lib/covers";
import { getStore } from "@/lib/data";
import { periodOf } from "@/lib/dates";
import { t } from "@/messages/fr";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const biography = await getStore().getBiography(slug);
  return { title: biography?.name, description: biography?.summary };
}

export default async function BiographyPage({ params }: Props) {
  const { slug } = await params;
  const store = getStore();
  const biography = await store.getBiography(slug);
  if (!biography) notFound();

  const [persons, session] = await Promise.all([store.listPersons(), store.getSession()]);
  const person = persons.find((candidate) => candidate.biographySlug === slug);
  const covers = listCovers();
  const hasText = Boolean(biography.body.trim());
  // Les années viennent uniquement du profil.
  const period = person ? periodOf(person.birthDate, person.deathDate) : "";
  // Le profil complet se trouve dans l'administration ; le public voit la fiche de la silsila.
  const profile = person && (session?.isAdmin ? `/admin/mouqaddams/${person.id}` : `/silsila/${person.id}`);

  return (
    <article>
      <div className="pattern-band" style={coverStyle(biography, covers)}>
        {session?.isAdmin && covers.length > 0 && <CoverChanger biography={biography} covers={covers} />}
        <h1 className="pattern-title">
          <span>{biography.name}</span>
        </h1>
      </div>

      <div className="entry mt-6">
        {person?.hasImage && (
          <div className="mb-4">
            <Link href={profile!} aria-label={t.biographies.profile}>
              <Avatar person={person} size={120} />
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label">{period || t.home.biographiesLabel}</p>
          {profile && (
            <Link href={profile} className="label hover:underline">
              {t.biographies.profile} →
            </Link>
          )}
        </div>

        {/* « Brouillon » : une note de travail pour l'admin, pas pour les visiteurs. */}
        {session?.isAdmin && biography.draft && hasText && (
          <p className="mt-4 rounded-md border border-line bg-surface p-3 text-sm text-muted">{t.biographies.draft}</p>
        )}

        {!hasText && (
          <div className="mt-6 rounded-md border border-line bg-surface p-5 text-center">
            <p className="text-muted">{t.biographies.empty_text}</p>
            {session?.isAdmin && (
              <Link href={`/biographies/${slug}/modifier`} className="button mt-3">
                {t.biographies.write}
              </Link>
            )}
          </div>
        )}

        {hasText && (
          <div className="mt-6">
            <MarkdownText>{biography.body}</MarkdownText>
          </div>
        )}

        {biography.sources.length > 0 && (
          <section className="mt-10">
            <h2 className="section-title">{t.biographies.sources}</h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted">
              {biography.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="label mt-10 flex flex-wrap justify-between gap-4 border-t border-line pt-5">
          <Link href="/biographies" className="hover:underline">
            ← {t.biographies.back}
          </Link>
          {session?.isAdmin && (
            <Link href={`/biographies/${slug}/modifier`} className="hover:underline">
              {t.biographies.edit}
            </Link>
          )}
          {person && (
            <Link href={`/silsila/${person.id}`} className="hover:underline">
              {t.biographies.chain} →
            </Link>
          )}
        </p>
      </div>
    </article>
  );
}
