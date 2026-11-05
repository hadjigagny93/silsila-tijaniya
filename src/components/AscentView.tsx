"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { t } from "@/messages/fr";
import { BigFlame } from "./BigFlame";

export type AscentRow = {
  id: string;
  number: number;
  arabic: string;
  name: string;
  sectionArabic: string;
  sectionName: string;
  // Première station de sa section : une ligne plus marquée la sépare de la précédente.
  sectionStart: boolean;
  kind: "station" | "state" | "horizon";
  degree: number;
  // Rang de la section, de 1 (les débuts) à 10 (les fins) : donne sa teinte à la strate sans image.
  section: number;
  // Image qui symbolise la station, prise dans images-stations ; vide, la strate garde sa teinte.
  image: string | null;
};

// Le modèle ascendant : les cent stations empilées en strates, la première en bas, la centième en haut.
// À l'arrivée, le curseur part du sommet et descend jusqu'à la station atteinte.
// Le soleil de la station du mois : il parcourt un demi-cercle, du coin bas-gauche au coin bas-droit
// de la strate en passant par le sommet, d'un pas par jour de la période ;
// son éclat suit la part du temps de Suluk accomplie ce jour-là.
export type AscentSun = {
  id: string;
  steps: number;
  // Un taux par jour écoulé, de 0 à 1 ; le dernier est celui d'aujourd'hui.
  trail: number[];
  label: string;
  // Flamme de la période : la somme des journées passées, rapportée à toute la durée de la période.
  periodFlame: { intensity: number; label: string };
};

function Sun({ sun }: { sun: AscentSun }) {
  const position = (index: number) => {
    const ratio = sun.steps > 1 ? Math.min(index, sun.steps - 1) / (sun.steps - 1) : 1;
    // Demi-ellipse inscrite dans la strate : on part à gauche, on culmine au milieu, on finit à droite.
    const angle = ratio * Math.PI;
    return { left: `${((1 - Math.cos(angle)) / 2) * 100}%`, bottom: `${Math.sin(angle) * 100}%` };
  };
  const today = sun.trail.length - 1;
  return (
    <>
      <BigFlame className="big-flame-strate" fill={sun.periodFlame.intensity} label={sun.periodFlame.label} />
      <div className="ascent-sun-path" aria-hidden>
        {sun.trail.slice(0, -1).map((ratio, index) => (
          <span
            key={index}
            className="ascent-sun-trace"
            style={{ ...position(index), "--b": ratio } as React.CSSProperties}
          />
        ))}
        {today >= 0 && (
          <span
            className={`ascent-sun-spot${today / Math.max(1, sun.steps - 1) > 0.5 ? " is-high" : ""}`}
            style={position(today)}
          >
            <span className="ascent-sun" style={{ "--b": sun.trail[today] } as React.CSSProperties} />
            <span className="ascent-sun-label">{sun.label}</span>
          </span>
        )}
      </div>
    </>
  );
}

export function AscentView({
  rows,
  cursor,
  sun,
}: {
  rows: AscentRow[];
  cursor: { id: string; level: number };
  sun: AscentSun | null;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    const list = listRef.current;
    if (!marker || !list) return;
    const row = marker.closest("li")!;
    let frame = 0;
    let cancelled = false;
    // Les images fixent la hauteur des strates : on attend qu'elles soient là pour viser la bonne station.
    const images = [...list.querySelectorAll("img")].filter((image) => !image.complete);
    const loaded = (image: HTMLImageElement) =>
      new Promise((done) => {
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
      });
    Promise.all(images.map(loaded)).then(() => {
      if (cancelled) return;
      marker.style.setProperty("--from", `${list.getBoundingClientRect().top - row.getBoundingClientRect().top}px`);
      frame = requestAnimationFrame(() => {
        setLanded(true);
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ascent-frame">
      <div className="ascent-head" aria-hidden>
        <span />
        {[2, 3, 4].map((degree) => {
          const [rank, ...word] = t.echiquier.degrees[degree].split(" ");
          return (
            <span key={degree}>
              {rank}
              <span className="ascent-head-word"> {word.join(" ")}</span>
            </span>
          );
        })}
      </div>
      <ol ref={listRef} className="ascent" aria-label={t.echiquier.ascentTitle}>
        {[...rows].reverse().map((row) => {
          const here = row.id === cursor.id;
          return (
            <li
              key={row.id}
              className={`ascent-row is-${row.kind}${row.sectionStart ? " is-section-start" : ""}${here ? " is-here" : ""}${row.image ? " has-image" : ""}${sun?.id === row.id ? " has-sun" : ""}`}
              data-section={row.section}
              style={row.image ? ({ "--strate": `url("${row.image}")` } as React.CSSProperties) : undefined}
            >
              {row.image && (
                // L'image entière fixe la hauteur de la strate ; le texte et les degrés se posent dessus, en bas.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.image} alt="" className="ascent-image" />
              )}
              {sun?.id === row.id && <Sun sun={sun} />}
              <Link href={`/echiquier/${row.id}`} className="ascent-station">
                <span className="ascent-number">{row.number}</span>
                <span lang="ar" className="ascent-arabic">
                  {row.arabic}
                </span>
                <span className="ascent-name">{row.name}</span>
              </Link>
              <div className="ascent-degrees">
                {row.kind === "station" ? (
                  [1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`ascent-degree${row.degree - 1 >= level ? " is-reached" : ""}${row.degree === 1 && level === 1 ? " is-practising" : ""}`}
                      title={t.echiquier.degrees[level + 1]}
                    >
                      {here && cursor.level === level && (
                        <span
                          ref={markerRef}
                          className={`ascent-cursor${landed ? " is-landed" : ""}`}
                          aria-label={t.echiquier.youAreHere}
                        >
                          ▼
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="ascent-kind">
                    {row.kind === "state" ? t.echiquier.stateShort : t.echiquier.horizonShort}
                  </span>
                )}
                {here && cursor.level === 0 && (
                  <span
                    ref={markerRef}
                    className={`ascent-cursor is-start${landed ? " is-landed" : ""}`}
                    aria-label={t.echiquier.youAreHere}
                  >
                    ▼
                  </span>
                )}
              </div>
              {row.sectionStart && (
                <span className="ascent-section">
                  <span lang="ar">{row.sectionArabic}</span> · {row.sectionName}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
