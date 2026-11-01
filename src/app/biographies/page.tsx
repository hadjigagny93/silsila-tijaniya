import type { Metadata } from "next";
import Link from "next/link";
import { biographies } from "@/content/biographies";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.biographies.title };

export default function BiographiesPage() {
  return (
    <>
      <h1 className="text-4xl">{t.biographies.title}</h1>
      <p className="mt-2 text-muted">{t.biographies.intro}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {biographies.map((biography) => (
          <li key={biography.slug}>
            <Link
              href={`/biographies/${biography.slug}`}
              className="block h-full rounded-lg border border-line bg-surface p-5 hover:border-accent"
            >
              <h2 className="text-2xl text-accent">{biography.name}</h2>
              {biography.period && <p className="text-sm text-muted">{biography.period}</p>}
              <p className="mt-2">{biography.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
