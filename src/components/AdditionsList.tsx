"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Addition, PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";

type Item = Addition & { person: PublicPerson | null };

// Qui a ajouté : l'e-mail de l'admin en ligne, ou l'app (Mac, iPhone) ; vide pour les fiches d'avant l'historique.
function authorLabel(addedBy: string | null) {
  if (!addedBy) return t.additions.before;
  if (addedBy === "mac") return t.additions.mac;
  if (addedBy === "iphone") return t.additions.iphone;
  return addedBy;
}

// Les jours et les heures à l'heure de l'appareil qui regarde.
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("fr-CA");
function dayLabel(iso: string) {
  const day = dayKey(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (day === today.toLocaleDateString("fr-CA")) return t.additions.today;
  if (day === yesterday.toLocaleDateString("fr-CA")) return t.additions.yesterday;
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function AdditionsList({ additions, limit }: { additions: Item[]; limit: number }) {
  const [author, setAuthor] = useState<string | null>(null);

  // Chaque auteur, avec son nombre d'ajouts ; « avant l'historique » toujours en dernier.
  const authors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of additions) counts.set(item.addedBy ?? "", (counts.get(item.addedBy ?? "") ?? 0) + 1);
    return [...counts].sort(([a, x], [b, y]) => Number(!a) - Number(!b) || y - x);
  }, [additions]);

  const shown = author === null ? additions : additions.filter((item) => (item.addedBy ?? "") === author);
  const days: { key: string; label: string; items: Item[] }[] = [];
  for (const item of shown) {
    const key = dayKey(item.createdAt);
    if (days.at(-1)?.key !== key) days.push({ key, label: dayLabel(item.createdAt), items: [] });
    days.at(-1)!.items.push(item);
  }

  if (!additions.length) return <p className="mt-8 text-muted">{t.additions.empty}</p>;

  return (
    <div className="additions mt-6">
      <div className="additions-filters" role="group" aria-label={t.additions.by}>
        <button type="button" aria-pressed={author === null} onClick={() => setAuthor(null)}>
          {t.additions.all} <small>{additions.length}</small>
        </button>
        {authors.map(([key, count]) => (
          <button
            key={key || "avant"}
            type="button"
            aria-pressed={author === key}
            title={key ? undefined : t.additions.beforeHelp}
            onClick={() => setAuthor(key)}
          >
            {authorLabel(key || null)} <small>{count}</small>
          </button>
        ))}
      </div>

      {days.map((day) => (
        <section key={day.key} className="additions-day">
          <h2 suppressHydrationWarning>
            {day.label} <small>{t.additions.count(day.items.length)}</small>
          </h2>
          <ul>
            {day.items.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/mouqaddams/${item.id}`} className="additions-row">
                  {item.person ? <Avatar person={item.person} size={36} /> : <span className="avatar" style={{ width: 36, height: 36 }} />}
                  <span className="additions-name">
                    <strong>{item.name}</strong>
                    <small>{t.kinds[item.kind]}</small>
                  </span>
                  <span className={`additions-author${item.addedBy ? "" : " is-before"}`} title={item.addedBy ?? t.additions.beforeHelp}>
                    {authorLabel(item.addedBy)}
                  </span>
                  <time dateTime={item.createdAt} suppressHydrationWarning>
                    {timeOf(item.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {additions.length >= limit && <p className="mt-6 text-sm text-muted">{t.additions.shown(limit)}</p>}
    </div>
  );
}
