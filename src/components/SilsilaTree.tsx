"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chainOf, childrenOf, generationsOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";
import { periodOf } from "@/lib/dates";
import { placeChoices, placeOf } from "@/lib/places";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { PlaceQuickForm } from "./PlaceQuickForm";
import { DEFAULT_LINEAGE, type Lineage, type SceneApi } from "./sceneTypes";
import { useDarkTheme } from "./useDarkTheme";
import { useDragCard } from "./useDragCard";
import { useStoredToggle } from "./useStoredToggle";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f‘’ʿʾ']/g, "")
    .toLowerCase();
}

// Souligne la partie du nom qui correspond à la recherche, signes compris.
function Highlighted({ name, query }: { name: string; query: string }) {
  const index = normalize(name).indexOf(normalize(query));
  if (index < 0 || !query) return <>{name}</>;
  const letters = [...name];
  // La forme normalisée garde une lettre par lettre de base : les positions concordent.
  const plain = letters.map((letter) => normalize(letter));
  let start = 0;
  let count = 0;
  for (let position = 0; position < letters.length; position++) {
    if (count === index) {
      start = position;
      break;
    }
    count += plain[position].length;
  }
  let end = start;
  let length = 0;
  while (end < letters.length && length < normalize(query).length) length += plain[end++].length;
  return (
    <>
      {letters.slice(0, start).join("")}
      <u>{letters.slice(start, end).join("")}</u>
      {letters.slice(end).join("")}
    </>
  );
}

export function SilsilaTree({
  persons,
  initialId,
  canLink = false,
}: {
  persons: PublicPerson[];
  initialId?: string;
  // Admin : un bouton mène à « Ajouter une silsila » (relier une personne à son maître).
  canLink?: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const drag = useDragCard();
  const labels = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneApi | null>(null);
  const chosen = useRef<string | null>(initialId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const silver = useStoredToggle("silsila:chaines-argentees", true);
  // Tous les noms à la fois ; par défaut, seulement ceux sans photo (les autres au survol).
  const names = useStoredToggle("silsila:tous-les-noms", false);
  // Deux vues des mêmes chaînes : l'arbre, ou la carte du monde.
  const map = useStoredToggle("silsila:carte", false);
  const namesNow = useRef(false);
  const hasSilver = persons.some((person) => person.alsoFrom.length > 0);
  // Lu à la création de la scène, sans la recréer quand l'affichage change.
  const dark = useDarkTheme();
  const [generation, setGeneration] = useState<number | null>(null);
  const generationNow = useRef<number | null>(null);
  // Pour la personne choisie : ses shouyoukhs seulement au départ ; les disciples s'ajoutent d'un bouton.
  const [lineage, setLineage] = useState<Lineage>(DEFAULT_LINEAGE);
  const lineageNow = useRef<Lineage>(DEFAULT_LINEAGE);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  // Lieux complétés ici même : la personne quitte la liste sans recharger l'arbre.
  const [placed, setPlaced] = useState<Map<string, PublicPerson>>(new Map());
  const [placing, setPlacing] = useState<string | null>(null);
  // Exploration : titre, recherche et bouton d'ajout s'effacent, la molette déplace l'arbre.
  const [exploring, setExploring] = useState(false);
  const exploringNow = useRef(false);

  useEffect(() => {
    namesNow.current = names.shown;
    scene.current?.setDisplay?.(names.shown ? "name" : "photo");
  }, [names.shown]);

  const remember = useCallback((id: string | null) => {
    chosen.current = id;
    setSelectedId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (map.shown ? import("./silsilaMap2d") : import("./silsilaTree2d"))
      .then(({ createScene }) => {
        if (cancelled || !stage.current || !labels.current) return;
        scene.current = createScene({
          container: stage.current,
          labels: labels.current,
          persons,
          dark,
          generation: generationNow.current,
          lineage: lineageNow.current,
          onSelect: remember,
        });
        if (chosen.current) scene.current.select(chosen.current);
        scene.current.setExploring?.(exploringNow.current);
        if (namesNow.current) scene.current.setDisplay?.("name");
      })
      .catch((error) => {
        console.error(error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
    // L'arbre suit le thème par ses couleurs : il n'est pas recréé quand le thème change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persons, remember, map.shown]);

  const generations = useMemo(() => generationsOf(persons), [persons]);
  const ranks = useMemo(() => [...new Set(generations.values())].sort((a, b) => a - b), [generations]);
  const generationSize = [...generations.values()].filter((rank) => rank === generation).length;
  const tree = useMemo(() => childrenOf(persons), [persons]);
  const known = useMemo(() => new Set(persons.map((person) => person.id)), [persons]);
  const pending = persons.filter(
    (person) =>
      person.kind !== "prophet" && person.kind !== "member" && (!person.mouqaddamId || !known.has(person.mouqaddamId)),
  );
  // Ceux que la carte ne sait pas placer (ni ville ni pays connus), ceux qui ont le plus de disciples d'abord.
  const unplaced = useMemo(
    () =>
      persons
        .map((person) => placed.get(person.id) ?? person)
        .filter((person) => person.kind !== "prophet" && person.kind !== "member" && !placeOf(person))
        .sort(
          (a, b) =>
            (tree.get(b.id)?.length ?? 0) - (tree.get(a.id)?.length ?? 0) ||
            a.displayName.localeCompare(b.displayName, "fr"),
        ),
    [persons, tree, placed],
  );
  const choices = useMemo(() => placeChoices(persons), [persons]);

  const describe = (person: PublicPerson) => {
    const rank = generations.get(person.id);
    return [t.kinds[person.kind], rank && t.silsila.generationShort(rank)].filter(Boolean).join(" · ");
  };

  const matches = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return [];
    return persons
      .filter((person) => normalize([person.displayName, ...person.nicknames].join(" ")).includes(term))
      .slice(0, 6);
  }, [persons, query]);

  const selected = selectedId ? chainOf(persons, selectedId) : null;
  const person = selected?.chain.at(-1);

  function changeGeneration(next: number | null) {
    generationNow.current = next;
    setGeneration(next);
    // Une génération se regarde en entier : la sélection en cours se referme.
    if (chosen.current) scene.current?.reset();
    scene.current?.setGeneration?.(next);
  }

  const changeExploring = useCallback((next: boolean) => {
    exploringNow.current = next;
    setExploring(next);
    scene.current?.setExploring?.(next);
  }, []);

  // Échap quitte l'exploration ; les flèches font glisser l'arbre.
  useEffect(() => {
    if (!exploring) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") changeExploring(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exploring, changeExploring]);

  function choose(id: string) {
    // Une personne d'une autre génération serait estompée : on revoit tout.
    if (generation !== null && generations.get(id) !== generation) changeGeneration(null);
    remember(id);
    setQuery("");
    setActive(0);
    scene.current?.select(id);
  }

  function onSearchKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, matches.length - 1));
    if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") event.preventDefault();
    if (event.key === "Enter" && matches[active]) choose(matches[active].id);
    if (event.key === "Escape") setQuery("");
  }

  const legend: { label: string; className: string }[] = [
    { label: t.kinds.cheikh, className: "legend-cheikh" },
    { label: t.kinds.mouqaddam, className: "legend-mouqaddam" },
    { label: t.kinds.member, className: "legend-member" },
  ];

  return (
    <section
      className="silsila-stage"
      data-dark={dark || undefined}
      data-exploring={exploring || undefined}
      data-silver={silver.shown ? undefined : "off"}
      data-chosen={selectedId ? "" : undefined}
      aria-label={t.silsila.title}
    >
      <div ref={stage} className="absolute inset-0" />
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />

      <div data-tree-top className="silsila-head">
        <p className="eyebrow">{t.silsila.eyebrow}</p>
        <h1 className="silsila-title">{t.silsila.heading}</h1>
        <p className="silsila-intro">{t.silsila.lead}</p>
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <div className="silsila-search">
            <label className="sr-only" htmlFor="tree-search">
              {t.silsila.searchLabel}
            </label>
            <Icon name="search" />
            <input
              id="tree-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder={t.silsila.searchLabel}
              autoComplete="off"
              role="combobox"
              aria-expanded={Boolean(query.trim())}
              aria-controls="tree-results"
            />
            {query.trim() && (
              <div className="search-results" id="tree-results">
                {matches.length === 0 ? (
                  <div className="search-empty">
                    <p className="font-display text-lg">{t.silsila.noMatch(query.trim())}</p>
                    <p className="mt-1 text-sm text-muted">{t.silsila.noMatchHelp}</p>
                  </div>
                ) : (
                  <ul role="listbox">
                    {matches.map((match, index) => (
                      <li key={match.id} role="option" aria-selected={index === active}>
                        <button
                          type="button"
                          className="search-option"
                          data-active={index === active}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => choose(match.id)}
                        >
                          <Avatar person={match} size={40} />
                          <span className="min-w-0">
                            <span className="picker-name">
                              <Highlighted name={match.displayName} query={query.trim()} />
                            </span>
                            <span className="picker-detail">{describe(match)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {matches.length > 0 && <p className="search-foot">{t.silsila.searchFoot(matches.length)}</p>}
              </div>
            )}
          </div>
          {canLink && (
            <Link href="/mon-compte" className="button silsila-cta">
              <Icon name="plus" size={16} />
              {t.silsila.add}
            </Link>
          )}
          {canLink && (
            <Link href="/admin/silsila" className="button-quiet silsila-cta">
              <Icon name="link" size={16} />
              {t.nav.adminSilsila}
            </Link>
          )}
        </div>
      </div>

      {failed && <p className="panel absolute inset-x-4 top-1/2 mx-auto max-w-md">{t.silsila.noWebgl}</p>}

      {person && selected ? (
        <aside key="personne" className="person-card-float is-draggable" aria-label={person.displayName} {...drag.card}>
          <span className="card-resize" aria-hidden title={t.silsila.resizeCard} {...drag.grip} />
          <button onClick={() => scene.current?.reset()} aria-label={t.silsila.close} className="card-close">
            <Icon name="close" />
          </button>
          <div className="flex items-center gap-4">
            <span className="card-avatar">
              {person.kind === "prophet" ? (
                <span className="saw text-4xl">ﷺ</span>
              ) : (
                <Avatar person={person} size={78} />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-[28px] leading-tight">{person.displayName}</h2>
              <p className="mt-1 text-sm text-muted">
                {[describe(person), periodOf(person.birthDate, person.deathDate)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {person.kind !== "prophet" && (
            <p className="card-links">
              {selected.complete ? (
                <>
                  <b>{selected.chain.length - 1}</b>
                  {t.silsila.linksAfter(selected.chain.length - 1)}
                </>
              ) : (
                t.silsila.incomplete
              )}
            </p>
          )}
          {person.kind !== "prophet" && (
            <div className="lineage-toggle" role="group" aria-label={t.silsila.lineage}>
              {(["masters", "disciples"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={lineage[side]}
                  onClick={() => {
                    const next = { ...lineage, [side]: !lineage[side] };
                    // L'une des deux vues reste toujours allumée.
                    if (!next.masters && !next.disciples) return;
                    lineageNow.current = next;
                    setLineage(next);
                    scene.current?.setLineage?.(next);
                  }}
                >
                  {side === "masters" ? t.silsila.masters : t.silsila.disciples}
                </button>
              ))}
            </div>
          )}
          <div className="card-actions mt-4 space-y-2.5">
            <Link href={`/silsila/${person.id}`} className="button w-full">
              {t.silsila.openChain}
            </Link>
            {person.biographySlug && (
              <Link href={`/biographies/${person.biographySlug}`} className="profile-link mx-auto flex w-fit">
                {t.silsila.biography}
                <Icon name="arrowR" size={16} />
              </Link>
            )}
          </div>
        </aside>
      ) : (
        // Chaînes et lieux à compléter : du travail d'admin, pas pour les visiteurs du site.
        canLink && (
          <div className="pending-floats">
            {pending.length > 0 && (
              <aside key="a-completer" className="person-card-float pending-float" aria-label={t.silsila.pending}>
                <button
                  className="flex w-full items-center gap-3 text-start"
                  onClick={() => setPendingOpen(!pendingOpen)}
                  aria-expanded={pendingOpen}
                >
                  <span className="text-gold">
                    <Icon name="branch" />
                  </span>
                  <span className="flex-1 font-display text-[22px]">{t.silsila.pending}</span>
                  <span className="count-badge">{pending.length}</span>
                </button>
                {pendingOpen && (
                  <>
                    <p className="mt-2 font-serif-text text-[15px] text-muted">{t.silsila.pendingText}</p>
                    <ul className="pending-mini">
                      {pending.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <span className="pending-avatar">
                            <Avatar person={item} size={34} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="picker-name truncate" title={item.displayName}>
                              {item.displayName}
                            </span>
                            <span className="picker-detail">
                              {[t.admin.disciples(tree.get(item.id)?.length ?? 0), item.birthCity]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <Link href="/admin/silsila" className="profile-link mt-0">
                            {t.admin.link}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {pending.length > 5 && (
                      <Link href="/admin/silsila" className="profile-link">
                        {t.silsila.pendingMore(pending.length - 5)}
                        <Icon name="arrowR" size={16} />
                      </Link>
                    )}
                  </>
                )}
              </aside>
            )}
            {unplaced.length > 0 && (
              <aside key="lieux" className="person-card-float pending-float" aria-label={t.silsila.unplaced}>
                <button
                  className="flex w-full items-center gap-3 text-start"
                  onClick={() => setPlacesOpen(!placesOpen)}
                  aria-expanded={placesOpen}
                >
                  <span className="text-gold">
                    <Icon name="pin" />
                  </span>
                  <span className="flex-1 font-display text-[22px]">{t.silsila.unplaced}</span>
                  <span className="count-badge">{unplaced.length}</span>
                </button>
                {placesOpen && (
                  <>
                    <p className="mt-2 font-serif-text text-[15px] text-muted">{t.silsila.unplacedText}</p>
                    <ul className="pending-mini pending-scroll">
                      {unplaced.map((item) => (
                        <li key={item.id}>
                          <span className="pending-avatar">
                            <Avatar person={item} size={34} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="picker-name truncate" title={item.displayName}>
                              {item.displayName}
                            </span>
                            <span className="picker-detail">
                              {[t.kinds[item.kind], t.admin.disciples(tree.get(item.id)?.length ?? 0)].join(" · ")}
                            </span>
                          </span>
                          {placing !== item.id &&
                            (canLink ? (
                              <button className="profile-link mt-0" onClick={() => setPlacing(item.id)}>
                                {t.silsila.complete}
                              </button>
                            ) : (
                              <Link href={`/admin/mouqaddams/${item.id}`} className="profile-link mt-0">
                                {t.silsila.complete}
                              </Link>
                            ))}
                          {placing === item.id && (
                            <PlaceQuickForm
                              person={item}
                              choices={choices}
                              onCancel={() => setPlacing(null)}
                              onSaved={(next) => {
                                setPlacing(null);
                                setPlaced((current) => new Map(current).set(item.id, { ...item, ...next }));
                                // Sur la carte, la personne apparaît aussitôt ; l'arbre, lui, garde sa forme.
                                if (map.shown) router.refresh();
                              }}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </aside>
            )}
          </div>
        )
      )}

      <div className="zoom-panel">
        <button onClick={() => scene.current?.zoom(0.75)} aria-label={t.silsila.zoomIn}>
          <Icon name="plus" />
        </button>
        <button onClick={() => scene.current?.zoom(1.33)} aria-label={t.silsila.zoomOut}>
          <Icon name="minus" />
        </button>
        <button onClick={() => scene.current?.overview()} aria-label={t.silsila.resetView}>
          <Icon name="recenter" />
        </button>
        {!map.shown && (
          <button
            onClick={() => scene.current?.rearrange?.()}
            aria-label={t.silsila.rearrange}
            title={t.silsila.rearrange}
          >
            <Icon name="wind" />
          </button>
        )}
      </div>

      <div className="silsila-bar">
        <button
          className="bar-explore"
          aria-pressed={exploring}
          onClick={() => changeExploring(!exploring)}
          title={exploring ? t.silsila.exploreLeave : t.silsila.exploreHint}
        >
          <Icon name={exploring ? "close" : "compass"} size={17} />
          {exploring ? t.silsila.exploreLeave : t.silsila.explore}
        </button>
        <div className="bar-group" role="group" aria-label={t.silsila.viewLabel}>
          <button aria-pressed={!map.shown} onClick={() => map.shown && map.toggle()}>
            {t.silsila.viewTree}
          </button>
          <button aria-pressed={map.shown} onClick={() => !map.shown && map.toggle()}>
            {t.silsila.viewMap}
          </button>
        </div>
        {ranks.length > 0 && (
          <div className="bar-group" role="group" aria-label={t.silsila.generationLabel}>
            <span className="bar-label">{t.silsila.generationBar}</span>
            <button aria-pressed={generation === null} onClick={() => changeGeneration(null)}>
              {t.silsila.generationAll}
            </button>
            {ranks.map((rank) => (
              <button
                key={rank}
                aria-pressed={generation === rank}
                aria-label={`${t.silsila.generationLabel} ${rank}`}
                onClick={() => changeGeneration(rank)}
              >
                {rank}
              </button>
            ))}
          </div>
        )}
        <div className="bar-group" role="group" aria-label={t.silsila.namesLabel}>
          <button aria-pressed={names.shown} onClick={names.toggle}>
            {t.silsila.namesToggle}
          </button>
        </div>
        {hasSilver && (
          <div className="bar-group" role="group" aria-label={t.silsila.silverLabel}>
            <button aria-pressed={silver.shown} onClick={silver.toggle} className="bar-silver">
              {t.silsila.silverToggle}
            </button>
          </div>
        )}
        <p className="bar-legend">
          {exploring ? (
            <span>{t.silsila.exploreHelp}</span>
          ) : generation !== null ? (
            <span>{t.silsila.generationCount(generation, generationSize)}</span>
          ) : (
            legend.map((item) => (
              <span key={item.label}>
                <i className={item.className} aria-hidden />
                {item.label}
              </span>
            ))
          )}
        </p>
      </div>
    </section>
  );
}
