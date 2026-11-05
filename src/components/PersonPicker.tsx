"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Une liste native n'affiche que du texte : celle-ci montre l'image et le nom ensemble.
export function PersonPicker({
  name,
  persons,
  defaultValue = "",
  required = false,
  emptyLabel,
  label,
  profileBase,
  details,
  onChange,
}: {
  name: string;
  persons: PublicPerson[];
  defaultValue?: string;
  required?: boolean;
  emptyLabel: string;
  label: string;
  // Affiche sous la liste un lien vers le profil de la personne choisie.
  profileBase?: string;
  // Une ligne sous chaque nom : rang, génération, ville…
  details?: Record<string, string>;
  onChange?: (id: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const term = normalize(query.trim());
    return persons.filter((person) => normalize([person.displayName, ...person.nicknames].join(" ")).includes(term));
  }, [persons, query]);
  const selected = persons.find((person) => person.id === value);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function choose(id: string) {
    setValue(id);
    onChange?.(id);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") close();
    if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, matches.length - 1));
    if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") event.preventDefault();
    if (event.key === "Enter") {
      // Entrée choisit un nom : elle ne doit pas envoyer le formulaire.
      event.preventDefault();
      if (matches[active]) choose(matches[active].id);
    }
  }

  return (
    <div
      className="picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <input type="hidden" name={name} value={value} />
      {required && (
        <input
          className="picker-guard"
          aria-hidden
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
        />
      )}
      <button
        type="button"
        className="picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} : ${selected?.displayName ?? emptyLabel}`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {selected ? <Avatar person={selected} size={34} /> : <Icon name="search" />}
        <span className="min-w-0">
          <span className={selected ? "picker-name" : "text-muted"}>{selected?.displayName ?? emptyLabel}</span>
          {selected && details?.[selected.id] && <span className="picker-detail">{details[selected.id]}</span>}
        </span>
        <span aria-hidden className="ms-auto text-muted">
          <Icon name="chevron" />
        </span>
      </button>

      {profileBase && selected && selected.kind !== "prophet" && (
        <Link href={`${profileBase}/${selected.id}`} className="profile-link">
          {t.admin.viewProfile(selected.displayName)}
          <Icon name="arrowR" size={16} />
        </Link>
      )}

      {open && (
        <div className="picker-panel">
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={t.silsila.searchLabel}
            aria-label={t.silsila.searchLabel}
            className="field"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ul role="listbox" aria-label={label} className="picker-list">
            {!required && !query && (
              <li role="option" aria-selected={!value}>
                <button type="button" className="picker-option text-muted" onClick={() => choose("")}>
                  {emptyLabel}
                </button>
              </li>
            )}
            {matches.map((person, index) => (
              <li key={person.id} role="option" aria-selected={person.id === value}>
                <button
                  type="button"
                  className="picker-option"
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(person.id)}
                >
                  <Avatar person={person} />
                  <span className="min-w-0">
                    <span className="block">{person.displayName}</span>
                    {(details?.[person.id] || person.nicknames.length > 0) && (
                      <span className="block text-xs text-muted">
                        {details?.[person.id] ?? <i>{person.nicknames.join(", ")}</i>}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="p-2 text-sm text-muted">{t.silsila.noResult}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
