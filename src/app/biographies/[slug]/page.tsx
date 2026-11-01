import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBiography } from "@/content/biographies";
import { getStore } from "@/lib/data";
import { t } from "@/messages/fr";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const biography = getBiography(slug);
  return { title: biography?.name, description: biography?.summary };
}

export default async function BiographyPage({ params }: Props) {
  const { slug } = await params;
  const biography = getBiography(slug);
  if (!biography) notFound();

  const persons = await getStore().listPersons();
  const person = persons.find((candidate) => candidate.biographySlug === slug);

  return (
    <article className="max-w-2xl">
      <Link href="/biographies" className="text-muted hover:underline">
        ← {t.biographies.back}
      </Link>
      <h1 className="mt-4 text-4xl">{biography.name}</h1>
      {biography.period && <p className="mt-1 text-muted">{biography.period}</p>}

      {biography.draft && (
        <p className="mt-6 rounded-md border border-gold/50 p-3 text-gold">{t.biographies.draft}</p>
      )}

      <div className="mt-6 space-y-4 text-lg leading-relaxed">
        {biography.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {person && (
        <p className="mt-8">
          <Link href={`/silsila/${person.id}`} className="text-accent underline">
            {t.biographies.chain}
          </Link>
        </p>
      )}
    </article>
  );
}
