import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-50m.json";
import { generationsOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";
import { type Place, placeOf } from "@/lib/places";
import { personImageUrl } from "./Avatar";
import { COLOR, DEFAULT_LINEAGE, discRadius, type Lineage, type SceneApi, type SceneOptions } from "./sceneTypes";
import { type Box, createSvgStage, svg } from "./svgStage";

const WIDTH = 2000;
// Écarts à l'écran, en pixels, quel que soit le zoom : entre deux personnes d'une même ville,
// et en deçà duquel deux villes se regroupent pour ne pas se chevaucher.
const SPACING = 26;
const MERGE = 30;
const ORDER = { prophet: 0, cheikh: 1, mouqaddam: 2, member: 3 };
let instances = 0;

type Pin = { person: PublicPerson; place: Place; group: SVGGElement; x: number; y: number };
type City = { x: number; y: number; pins: Pin[] };

// La carte du monde : chaque personne dont on connaît la ville (ou au moins le pays) y est posée,
// reliée à son maître par une chaîne dorée, et aux autres par des chaînes argentées.
export function createScene(options: SceneOptions): SceneApi {
  const id = `map${instances++}`;
  const topology = world as unknown as Topology<{ countries: GeometryCollection }>;
  const projection = geoNaturalEarth1().fitSize([WIDTH, WIDTH / 2], { type: "Sphere" });
  const path = geoPath(projection);

  const persons = options.persons.filter((person) => person.kind !== "prophet");
  const personById = new Map(options.persons.map((person) => [person.id, person]));
  const children = new Map<string, PublicPerson[]>();
  const silverDisciples = new Map<string, PublicPerson[]>();
  for (const person of persons) {
    if (person.mouqaddamId) children.set(person.mouqaddamId, [...(children.get(person.mouqaddamId) ?? []), person]);
    for (const master of person.alsoFrom) silverDisciples.set(master, [...(silverDisciples.get(master) ?? []), person]);
  }
  const generations = generationsOf(options.persons);

  const cities = new Map<string, City>();
  const pins = new Map<string, Pin>();
  for (const person of persons) {
    const place = placeOf(person);
    if (!place) continue;
    const [x, y] = projection([place.lon, place.lat])!;
    const city = cities.get(place.key) ?? { x, y, pins: [] };
    cities.set(place.key, city);
    const pin = { person, place, group: null as unknown as SVGGElement, x, y };
    city.pins.push(pin);
    pins.set(person.id, pin);
  }
  for (const city of cities.values()) {
    city.pins.sort(
      (a, b) => ORDER[a.person.kind] - ORDER[b.person.kind] || a.person.displayName.localeCompare(b.person.displayName),
    );
  }

  // Vue d'ensemble : les lieux connus, avec de l'air autour ; le monde entier s'il n'y en a aucun.
  const content = (): Box => {
    const all = [...cities.values()];
    if (!all.length) return { x: 0, y: 0, width: WIDTH, height: WIDTH / 2 };
    const xs = all.map((city) => city.x);
    const ys = all.map((city) => city.y);
    const width = Math.max(Math.max(...xs) - Math.min(...xs), 160);
    const height = Math.max(Math.max(...ys) - Math.min(...ys), 100);
    const pad = Math.max(width, height) * 0.25;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    return { x: cx - width / 2 - pad, y: cy - height / 2 - pad, width: width + pad * 2, height: height + pad * 2 };
  };

  let ready = false;
  let selected: string | null = null;
  let generation = options.generation ?? null;
  let lineage: Lineage = options.lineage ?? DEFAULT_LINEAGE;
  let scale = 0;

  const stage = createSvgStage(
    options.container,
    content,
    (tapped) => {
      const chosen = tapped && pins.has(tapped) ? tapped : null;
      select(chosen);
      options.onSelect(chosen);
    },
    undefined,
    { maxScale: 120, onView: (next) => ready && next !== scale && layout(next) },
  );
  stage.root.setAttribute("aria-label", "Carte du monde de la silsila");
  stage.root.classList.add("map-stage");

  const definitions = svg("defs", {}, stage.root);
  const clip = svg("clipPath", { id: id + "c", clipPathUnits: "objectBoundingBox" }, definitions);
  svg("circle", { cx: 0.5, cy: 0.5, r: 0.5 }, clip);
  const glow = svg("radialGradient", { id: id + "q" }, definitions);
  svg("stop", { offset: "0%", style: "stop-color:#2f8cff;stop-opacity:0.95" }, glow);
  svg("stop", { offset: "100%", style: "stop-color:#2f8cff;stop-opacity:0" }, glow);

  const layer = (name: string) => svg("g", { class: name }, stage.world);
  const base = layer("m-base");
  svg("path", { d: path({ type: "Sphere" })!, class: "m-ocean" }, base);
  svg("path", { d: path(geoGraticule10())!, class: "m-grid" }, base);
  svg("path", { d: path(feature(topology, topology.objects.countries))!, class: "m-land" }, base);
  svg("path", { d: path(mesh(topology, topology.objects.countries, (a, b) => a !== b))!, class: "m-border" }, base);
  const goldLayer = layer("m-arcs");
  const silverLayer = layer("t-silvers");
  const pinLayer = layer("m-pins");

  // Chaque personne : sa photo (ou un rond), et son nom, montré au survol.
  for (const pin of pins.values()) {
    const { person } = pin;
    const radius = Math.max(discRadius(person), (person.kind === "member" ? 6 : 10) * (person.hasImage ? 2 : 1));
    const group = svg("g", { "data-id": person.id, class: "t-hit m-pin" }, pinLayer);
    svg("circle", { r: Math.max(radius, 12), class: "t-target" }, group);
    // Famille du Prophète ﷺ : halo bleu.
    if (person.prophetFamily) svg("circle", { r: radius * 2.4, fill: `url(#${id}q)`, class: "t-family" }, group);
    svg("circle", { r: radius + 5, class: "m-ring" }, group);
    svg(
      "circle",
      {
        r: radius,
        class: `t-disc t-disc-${person.kind}${person.prophetFamily ? " t-disc-family" : ""}`,
        style: `stroke:${COLOR[person.kind]}`,
      },
      group,
    );
    if (person.hasImage) {
      const image = svg(
        "image",
        {
          href: personImageUrl(person),
          x: -radius + 1,
          y: -radius + 1,
          width: radius * 2 - 2,
          height: radius * 2 - 2,
          "clip-path": `url(#${id}c)`,
          preserveAspectRatio: "xMidYMid slice",
        },
        group,
      );
      image.setAttribute("pointer-events", "none");
    }
    const name = svg("text", { x: radius + 6, y: 4.5, class: "m-name" }, group);
    name.textContent = person.displayName;
    const title = svg("title", {}, group);
    title.textContent = `${person.displayName} — ${pin.place.name}`;
    pin.group = group;
  }

  // Chaînes : du maître vers le disciple, quand les deux sont sur la carte.
  const arcs: { from: Pin; to: Pin; path: SVGPathElement }[] = [];
  for (const pin of pins.values()) {
    const golden = pin.person.mouqaddamId ? pins.get(pin.person.mouqaddamId) : undefined;
    if (golden) arcs.push({ from: golden, to: pin, path: svg("path", { class: "m-arc" }, goldLayer) });
    for (const masterId of pin.person.alsoFrom) {
      const master = pins.get(masterId);
      if (master)
        arcs.push({ from: master, to: pin, path: svg("path", { class: "t-silver m-arc-silver" }, silverLayer) });
    }
  }

  // Combien de personnes sont sur la carte, et combien attendent un lieu.
  const note = document.createElement("p");
  note.className = "map-note";
  note.textContent = `${pins.size} sur la carte · ${persons.length - pins.size} sans lieu connu`;
  options.labels.appendChild(note);

  // À chaque échelle : les villes trop proches à l'écran se regroupent, et les personnes d'un même groupe
  // se rangent en spirale autour de son centre, à écart constant à l'écran.
  function layout(next: number) {
    scale = next;
    const k = 1 / scale;
    const groups: City[] = [];
    const spread = (count: number) => SPACING * Math.sqrt(count);
    for (const city of [...cities.values()].sort((a, b) => b.pins.length - a.pins.length)) {
      const near = groups.find(
        (group) =>
          Math.hypot(group.x - city.x, group.y - city.y) * scale <
          MERGE + spread(group.pins.length) + spread(city.pins.length),
      );
      if (near) {
        near.pins.push(...city.pins);
      } else {
        groups.push({ ...city, pins: [...city.pins] });
      }
    }
    for (const group of groups) {
      group.pins.forEach((pin, index) => {
        const angle = index * 2.39996;
        const distance = index ? SPACING * Math.sqrt(index) * 0.95 : 0;
        pin.x = group.x + Math.cos(angle) * distance * k;
        pin.y = group.y + Math.sin(angle) * distance * k;
        pin.group.setAttribute("transform", `translate(${pin.x} ${pin.y}) scale(${k})`);
      });
    }
    for (const { from, to, path } of arcs) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      // Une courbe légère, toujours du même côté : les chaînes aller et retour ne se superposent pas.
      const cx = (from.x + to.x) / 2 - dy * 0.18;
      const cy = (from.y + to.y) / 2 + dx * 0.18;
      path.setAttribute("d", `M${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
    }
  }

  // Une personne choisie : ses shouyoukhs, ses disciples, ou les deux (boutons de sa fiche) restent nets ;
  // le reste s'efface sans disparaître, pour garder la géographie.
  function restyle() {
    const up = new Set<string>();
    const down = new Set<string>();
    if (selected) {
      up.add(selected);
      down.add(selected);
    }
    if (selected && lineage.masters) {
      const climb = [selected];
      up.clear();
      while (climb.length) {
        const person = personById.get(climb.pop()!);
        if (!person || up.has(person.id)) continue;
        up.add(person.id);
        climb.push(...[person.mouqaddamId, ...person.alsoFrom].filter((value): value is string => Boolean(value)));
      }
    }
    if (selected && lineage.disciples) {
      const descend = [selected];
      down.clear();
      while (descend.length) {
        const current = descend.pop()!;
        if (down.has(current)) continue;
        down.add(current);
        descend.push(
          ...[...(children.get(current) ?? []), ...(silverDisciples.get(current) ?? [])].map((person) => person.id),
        );
      }
    }
    const linked = new Set([...up, ...down]);
    const shown = (personId: string) =>
      selected ? linked.has(personId) : generation === null || generations.get(personId) === generation;
    for (const pin of pins.values()) {
      pin.group.style.opacity = shown(pin.person.id) ? "1" : "0.18";
      pin.group.classList.toggle("is-chosen", pin.person.id === selected);
    }
    for (const { from, to, path } of arcs) {
      // Les chaînes n'apparaissent que pour la personne choisie : celles qui mènent à elle et qui partent d'elle.
      const on =
        Boolean(selected) &&
        ((lineage.masters && up.has(from.person.id) && up.has(to.person.id)) ||
          (lineage.disciples && down.has(from.person.id) && down.has(to.person.id)));
      path.style.display = on ? "" : "none";
    }
  }

  function select(personId: string | null) {
    selected = personId && pins.has(personId) ? personId : null;
    restyle();
    const pin = selected ? pins.get(selected) : null;
    if (pin) stage.reveal(pin.x, pin.y);
  }

  ready = true;
  stage.fit(false);
  restyle();
  if (options.display === "name") stage.root.dataset.names = "";

  return {
    select,
    setDisplay(next) {
      if (next === "name") stage.root.dataset.names = "";
      else delete stage.root.dataset.names;
    },
    setGeneration(next) {
      generation = next;
      restyle();
    },
    setLineage(next) {
      lineage = next;
      restyle();
    },
    setExploring: stage.setExploring,
    zoom: stage.zoom,
    overview: () => stage.fit(true),
    reset() {
      select(null);
      options.onSelect(null);
      stage.fit(true);
    },
    dispose() {
      note.remove();
      stage.dispose();
    },
  };
}
