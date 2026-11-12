"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export type BiographyEntry = {
  slug: string;
  name: string;
  summary: string;
  period: string;
  place: string;
  badges: string[];
  person: PublicPerson | null;
  // Texte où chercher : nom, surnoms, lieux, résumé.
  haystack: string;
};

export type BiographyIndexSection = { id: string; title: string; entries: BiographyEntry[] };

const b = t.biographies;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Liste des biographies : une recherche instantanée, des parties à rejoindre d'un geste, et des cartes qui
// donnent envie d'ouvrir (photo, années, lieu, première phrase).
export function BiographyIndex({ sections, hidden = [] }: { sections: BiographyIndexSection[]; hidden?: string[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const term = normalize(query.trim());

  const shown = useMemo(
    () =>
      sections
        // Les parties mises en avant plus haut ne reviennent que pendant une recherche.
        .filter((section) => term || !hidden.includes(section.id))
        .map((section) => ({
          ...section,
          entries: term ? section.entries.filter((entry) => entry.haystack.includes(term)) : section.entries,
        }))
        .filter((section) => section.entries.length > 0),
    [sections, hidden, term],
  );
  const total = shown.reduce((sum, section) => sum + section.entries.length, 0);

  // La partie lue s'allume dans la barre.
  useEffect(() => {
    const targets = shown.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((record) => record.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div className="bio-index">
      <div className="bio-toolbar">
        <label className="bio-search">
          <Icon name="search" size={18} />
          <span className="sr-only">{b.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={b.searchPlaceholder}
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={b.searchClear}>
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
        {shown.length > 1 && (
          <nav className="bio-chips" aria-label={b.sectionsLabel}>
            {shown.map((section) => (
              <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined}>
                {section.title}
                <span>{section.entries.length}</span>
              </a>
            ))}
          </nav>
        )}
      </div>

      {term && (
        <p className="bio-results" role="status">
          {b.searchResults(total)}
        </p>
      )}

      {shown.map((section) => (
        <section key={section.id} id={section.id} className="bio-section">
          <h2 className="bio-section-title">
            <span>{section.title}</span>
            <small>{section.entries.length}</small>
          </h2>
          <ul className="bio-cards">
            {section.entries.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/biographies/${entry.slug}`} className="bio-card">
                  {entry.person ? (
                    <Avatar person={entry.person} size={64} />
                  ) : (
                    <span className="avatar" style={{ width: 64, height: 64 }} aria-hidden />
                  )}
                  <span className="bio-card-text">
                    <span className="bio-card-name">{entry.name}</span>
                    {(entry.period || entry.place) && (
                      <span className="bio-card-meta">{[entry.period, entry.place].filter(Boolean).join(" · ")}</span>
                    )}
                    {entry.summary && <span className="bio-card-summary">{entry.summary}</span>}
                    {entry.badges.length > 0 && (
                      <span className="bio-card-badges">
                        {entry.badges.map((badge) => (
                          <span key={badge}>{badge}</span>
                        ))}
                      </span>
                    )}
                  </span>
                  <Icon name="arrowR" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}


