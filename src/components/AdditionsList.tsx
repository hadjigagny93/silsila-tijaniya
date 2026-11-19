"use client";

import Link from "next/link";
import type { Addition, PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";

type Item = Addition & { person: PublicPerson | null };

// D'où vient l'ajout : l'app (Mac, iPhone) ou l'e-mail de l'admin sur le site.
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

function Days({ items, mine }: { items: Item[]; mine: boolean }) {
  const days: { key: string; label: string; items: Item[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.createdAt);
    if (days.at(-1)?.key !== key) days.push({ key, label: dayLabel(item.createdAt), items: [] });
    days.at(-1)!.items.push(item);
  }
  return days.map((day) => (
    <section key={day.key} className="additions-day">
      <h3 suppressHydrationWarning>
        {day.label} <small>{t.additions.count(day.items.length)}</small>
      </h3>
      <ul>
        {day.items.map((item) => (
          <li key={item.id}>
            <Link href={`/admin/mouqaddams/${item.id}`} className="additions-row">
              {item.person ? (
                <Avatar person={item.person} size={36} />
              ) : (
                <span className="avatar" style={{ width: 36, height: 36 }} />
              )}
              <span className="additions-name">
                <strong>{item.name}</strong>
                <small>{t.kinds[item.kind]}</small>
              </span>
              {/* Mes ajouts : d'où (Mac, iPhone, site) ; ceux des autres : qui. */}
              <span
                className={`additions-author${item.addedBy ? "" : " is-before"}${mine ? " is-mine" : ""}`}
                title={item.addedBy ?? t.additions.beforeHelp}
              >
                {mine && item.addedBy?.includes("@") ? t.additions.site : authorLabel(item.addedBy)}
              </span>
              <time dateTime={item.createdAt} suppressHydrationWarning>
                {timeOf(item.createdAt)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
}

export function AdditionsList({ additions, mine, limit }: { additions: Item[]; mine: string[]; limit: number }) {
  if (!additions.length) return <p className="mt-8 text-muted">{t.additions.empty}</p>;

  const me = new Set(mine.map((value) => value.toLowerCase()));
  const isMine = (item: Item) => Boolean(item.addedBy) && me.has(item.addedBy!.toLowerCase());
  const own = additions.filter(isMine);
  const others = additions.filter((item) => item.addedBy && !isMine(item));
  const before = additions.filter((item) => !item.addedBy);

  return (
    <div className="additions mt-6">
      <div className="additions-columns">
        <section className="additions-column">
          <h2>
            {t.additions.mine} <small>{t.additions.count(own.length)}</small>
          </h2>
          {own.length ? <Days items={own} mine /> : <p className="mt-3 text-muted">{t.additions.noneMine}</p>}
        </section>
        <section className="additions-column">
          <h2>
            {t.additions.others} <small>{t.additions.count(others.length)}</small>
          </h2>
          {others.length ? <Days items={others} mine={false} /> : <p className="mt-3 text-muted">{t.additions.noneOthers}</p>}
        </section>
      </div>
      {before.length > 0 && (
        <details className="additions-before">
          <summary>
            {t.additions.before} <small>{t.additions.count(before.length)}</small>
          </summary>
          <p className="mt-2 text-sm text-muted">{t.additions.beforeHelp}</p>
          <Days items={before} mine={false} />
        </details>
      )}
      {additions.length >= limit && <p className="mt-6 text-sm text-muted">{t.additions.shown(limit)}</p>}
    </div>
  );
}
