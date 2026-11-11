"use client";

import { useId, useRef, useState } from "react";
import { matchesPlace, type PlaceChoices } from "@/lib/places";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// Un champ texte libre avec sa liste déroulante : on tape ou on choisit, accents et majuscules ignorés.
function PlaceInput({
  name,
  label,
  value,
  options,
  onChange,
  onPick,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  onChange(value: string): void;
  onPick?(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const query = value.trim();
  // La liste entière tant que le champ est vide, ou montre déjà un choix exact ; sinon ce qui correspond.
  const exact = options.some((option) => option === query);
  const shown = query && !exact ? options.filter((option) => matchesPlace(option, query)) : options;

  const choose = (option: string) => {
    onChange(option);
    onPick?.(option);
    setOpen(false);
    setActive(-1);
  };
  const move = (next: number) => {
    setActive(next);
    list.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="place-input">
        <input
          name={name}
          maxLength={120}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              move(Math.min(active + 1, shown.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(Math.max(active - 1, 0));
            } else if (event.key === "Enter" && open && shown[active]) {
              event.preventDefault();
              choose(shown[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="field"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
        />
        <button
          type="button"
          tabIndex={-1}
          className="place-toggle"
          aria-label={t.admin.placeList(label)}
          onMouseDown={(event) => {
            // Garde le curseur dans le champ : la liste s'ouvre ou se ferme sans perdre la saisie.
            event.preventDefault();
            (event.currentTarget.previousElementSibling as HTMLInputElement).focus();
            setOpen((value) => !value);
          }}
        >
          <Icon name="chevron" size={16} />
        </button>
        {open && shown.length > 0 && (
          <ul ref={list} id={listId} role="listbox" className="place-list">
            {shown.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                // Avant que le champ perde le focus et ferme la liste.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </span>
    </label>
  );
}

// Ville et pays d'une naissance ou d'un décès : choisir une ville connue remplit son pays s'il est vide.
export function PlaceFields({
  prefix,
  city,
  country,
  choices,
}: {
  prefix: "birth" | "death";
  city: string;
  country: string;
  choices: PlaceChoices;
}) {
  const [cityValue, setCity] = useState(city);
  const [countryValue, setCountry] = useState(country);

  return (
    <>
      <PlaceInput
        name={`${prefix}City`}
        label={t.admin.city}
        value={cityValue}
        options={choices.cities.map((choice) => choice.name)}
        onChange={setCity}
        onPick={(name) => {
          const found = choices.cities.find((choice) => choice.name === name);
          if (found?.country && !countryValue.trim()) setCountry(found.country);
        }}
      />
      <PlaceInput
        name={`${prefix}Country`}
        label={t.admin.country}
        value={countryValue}
        options={choices.countries}
        onChange={setCountry}
      />
    </>
  );
}
