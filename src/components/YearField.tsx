"use client";

import { useState } from "react";
import { t } from "@/messages/fr";

// Une année à quatre chiffres, exacte ou approximative (« vers 1855 »).
export function YearField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string | null }) {
  const [year, setYear] = useState(/\d{4}/.exec(defaultValue ?? "")?.[0] ?? "");
  const [approximate, setApproximate] = useState(Boolean(defaultValue?.startsWith("vers")));
  const known = /^\d{4}$/.test(year);

  return (
    <div className="year-field">
      <input type="hidden" name={name} value={known ? (approximate ? `vers ${year}` : year) : ""} />
      <input
        value={year}
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder={t.admin.yearUnknown}
        aria-label={label}
        title={t.admin.yearHelp}
        className="field field-year"
        onChange={(event) => setYear(event.target.value.replace(/\D/g, ""))}
      />
      <div role="radiogroup" aria-label={t.admin.yearPrecision} className="segmented" data-disabled={!known || undefined}>
        {[false, true].map((value) => (
          <label key={String(value)}>
            <input
              type="radio"
              checked={approximate === value}
              disabled={!known}
              onChange={() => setApproximate(value)}
            />
            <span>{value ? t.admin.yearAbout : t.admin.yearExact}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
