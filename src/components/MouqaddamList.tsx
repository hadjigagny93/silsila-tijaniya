"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { yearLabel } from "@/lib/dates";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { YearRail } from "./YearRail";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function lifespan(person: PublicPerson) {
  if (!person.birthDate && !person.deathDate) return "";
  return `(${yearLabel(person.birthDate)} – ${yearLabel(person.deathDate)})`;
}

export function MouqaddamList({
  persons,
}: {
  persons: PublicPerson[];
}) {
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const term = normalize(query.trim());
    return persons.filter((person) => normalize(
        [
          person.displayName,
          person.zawiya,
          person.birthCity,
          person.birthCountry,
          person.deathCity,
          person.deathCountry,
          ...person.nicknames,
        ].join(" "),
      ).includes(term));
  }, [persons, query]);

  const years = useMemo(() => matches.map((person) => person.birthDate), [matches]);

  return (
    <>
      <label className="sr-only" htmlFor="mouqaddam-search">
        {t.admin.search}
      </label>
      <input
        id="mouqaddam-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.admin.search}
        autoComplete="off"
        className="field mt-6 max-w-md"
      />

      {matches.length === 0 && <p className="mt-6 text-muted">{t.silsila.noResult}</p>}

      <ul ref={list} className="mt-6 grid gap-3">
        {matches.map((person) => (
          <li key={person.id}>
            <Link href={`/admin/mouqaddams/${person.id}`} className="person-card">
              <Avatar person={person} size={64} />
              <span className="min-w-0">
                <span className="block font-semibold">{person.displayName}</span>
                {lifespan(person) && <span className="block text-sm text-muted">{lifespan(person)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <YearRail years={years} list={list} />
    </>
  );
}
