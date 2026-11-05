"use client";

import { useState } from "react";
import { coverUrl } from "@/lib/coverUrl";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// Grande image de couverture ; « Changer l'image » ouvre la galerie juste dessous.
export function CoverField({
  covers,
  defaultValue,
  automatic,
}: {
  covers: string[];
  defaultValue: string | null;
  // Image montrée quand aucun choix n'est fait.
  automatic: string;
}) {
  const [cover, setCover] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const shown = cover || automatic;

  return (
    <div>
      <span className="field-label">{t.biographies.formCover}</span>
      <input type="hidden" name="cover" value={cover} />
      <div className="cover-preview" style={{ backgroundImage: `url("${coverUrl(shown)}")` }}>
        {!cover && <span className="cover-tag">{t.biographies.formCoverAuto}</span>}
        <button type="button" className="cover-button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="image" size={16} />
          {t.biographies.changeCover}
        </button>
      </div>
      {open && (
        <div className="cover-choices" role="radiogroup" aria-label={t.biographies.formCover}>
          {["", ...covers].map((name) => (
            <button
              key={name || "auto"}
              type="button"
              role="radio"
              aria-checked={cover === name}
              className="cover-choice"
              onClick={() => {
                setCover(name);
                setOpen(false);
              }}
            >
              {name ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl(name)} alt="" />
              ) : (
                <span className="cover-auto">{t.biographies.formCoverAuto}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
