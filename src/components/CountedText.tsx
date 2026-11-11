"use client";

import { useState } from "react";

// Zone de texte avec compteur de caractères dans l'angle du libellé.
export function CountedText({
  name,
  label,
  defaultValue,
  maxLength,
  rows,
}: {
  name: string;
  label: string;
  defaultValue: string;
  maxLength: number;
  rows: number;
}) {
  const [length, setLength] = useState(defaultValue.length);

  return (
    <label className="block">
      <span className="field-label field-label-split">
        {label}
        <small className="tabular-nums">
          {length} / {maxLength}
        </small>
      </span>
      <textarea
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className="field field-text"
        onChange={(event) => setLength(event.target.value.length)}
      />
    </label>
  );
}
