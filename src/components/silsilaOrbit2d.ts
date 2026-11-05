import { buildForest, chainTo, type ForestNode, hash, subtreeOf } from "@/lib/silsilaForest";
import type { SceneApi, SceneOptions } from "./sceneTypes";
import { type Box, createSvgStage, svg } from "./svgStage";

// Rayon d'orbite de chaque génération autour de son maître.
const ORBIT = [0, 250, 96, 52, 33, 22, 15, 10];
const COLOR = { prophet: "var(--gold)", cheikh: "var(--gold)", mouqaddam: "var(--accent)", member: "var(--muted)" };
let instances = 0;

// Chaque personne gravite autour de celle qui lui a transmis ; plus elle a transmis, plus elle brille.
export function createScene(options: SceneOptions): SceneApi {
  const forest = buildForest(options.persons);
  const id = `orbit${instances++}`;
  const nodes = forest?.nodes ?? [];
  const center = { x: 600, y: 430 };

  const placeAround = (node: ForestNode, start: number) => {
    const count = node.children.length;
    node.children.forEach((child, index) => {
      const angle = start + (Math.PI * 2 * index) / count + (node.depth === 0 ? -0.4 : 0.9);
      const radius = ORBIT[Math.min(child.depth, ORBIT.length - 1)];
      child.x = node.x + Math.cos(angle) * radius;
      child.y = node.y + Math.sin(angle) * radius * (node.depth === 0 ? 0.82 : 1);
      placeAround(child, angle + 0.5);
    });
  };
  if (forest) {
    forest.root.x = center.x;
    forest.root.y = center.y;
    forest.root.children.forEach((founder, index) => {
      founder.x = center.x + 40 + index * 30;
      founder.y = center.y - 30;
      placeAround(founder, 0);
    });
  }
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const content: Box = {
    x: Math.min(...xs, 300) - 60,
    y: Math.min(...ys, 150) - 50,
    width: Math.max(...xs, 900) - Math.min(...xs, 300) + 120,
    height: Math.max(...ys, 700) - Math.min(...ys, 150) + 100,
  };

  let selected: ForestNode | null = null;
  let isolated = false;
  let generation = options.generation ?? null;

  const stage = createSvgStage(options.container, content, (tapped) => {
    select(tapped);
    options.onSelect(tapped && forest?.byId.has(tapped) ? tapped : null);
  });
  stage.root.setAttribute("aria-label", "Vue planétaire");
  const definitions = svg("defs", {}, stage.root);
  for (const [suffix, color, strength] of [["g", "var(--gold)", 0.55], ["a", "var(--accent)", 0.45]] as const) {
    const gradient = svg("radialGradient", { id: id + suffix }, definitions);
    svg("stop", { offset: "0%", style: `stop-color:${color};stop-opacity:${strength}` }, gradient);
    svg("stop", { offset: "100%", style: `stop-color:${color};stop-opacity:0` }, gradient);
  }

  // Poussière d'étoiles, toujours la même.
  for (let index = 0; index < 90; index++) {
    const seed = hash(`etoile${index}`);
    svg("circle", {
      cx: content.x + hash(`x${index}`) * content.width,
      cy: content.y + hash(`y${index}`) * content.height,
      r: seed * 0.9 + 0.2,
      class: "o-dust",
      style: `opacity:${0.1 + seed * 0.25}`,
    }, stage.world);
  }

  const orbitLayer = svg("g", {}, stage.world);
  const lineLayer = svg("g", {}, stage.world);
  const bodyLayer = svg("g", {}, stage.world);
  const markLayer = svg("g", {}, stage.world);
  const labelLayer = svg("g", {}, stage.world);

  const orbits = new Map<ForestNode, SVGElement>();
  for (const node of nodes) {
    if (node.depth < 0 || !node.children.length) continue;
    const radius = ORBIT[Math.min(node.depth + 1, ORBIT.length - 1)];
    const orbit = node.depth === 0
      ? svg("ellipse", { cx: node.x, cy: node.y, rx: radius, ry: radius * 0.82, class: "o-orbit" }, orbitLayer)
      : svg("circle", { cx: node.x, cy: node.y, r: radius, class: "o-orbit" }, orbitLayer);
    if (node.depth >= 2) orbit.style.strokeDasharray = "2 3";
    orbits.set(node, orbit);
  }

  const bodies = new Map<ForestNode, SVGGElement>();
  for (const node of nodes) {
    if (node.depth < 0) continue;
    const kind = node.person.kind;
    const radius = node.depth === 0 ? 15 : 1.8 + Math.sqrt(node.desc) * 1.45;
    const group = svg("g", { transform: `translate(${node.x} ${node.y})`, "data-id": node.person.id, class: "t-hit" }, bodyLayer);
    svg("circle", { r: Math.max(radius + 6, 10), class: "t-target" }, group);
    if (node.desc >= 4 || node.depth === 0) {
      svg("circle", {
        r: radius * 3.6,
        fill: `url(#${id}${kind === "mouqaddam" ? "a" : "g"})`,
        style: `opacity:${Math.min(1, 0.25 + node.desc / 25)}`,
      }, group);
    }
    svg("circle", { r: radius, style: `fill:${COLOR[kind]};opacity:${kind === "member" ? 0.75 : 1}` }, group);
    const title = svg("title", {}, group);
    title.textContent = node.person.displayName;
    bodies.set(node, group);
  }

  // Médaillon du Prophète ﷺ au centre du système.
  if (forest) {
    svg("circle", { cx: center.x, cy: center.y, r: 50, class: "o-orbit o-orbit-gold" }, orbitLayer);
    const medal = svg("g", { transform: `translate(${center.x} ${center.y}) scale(0.62)`, "data-id": forest.root.person.id, class: "t-hit" }, stage.world);
    svg("circle", { r: 90, fill: `url(#${id}g)` }, medal);
    svg("circle", { r: 34, class: "t-medal" }, medal);
    svg("circle", { r: 28, class: "t-medal-inner" }, medal);
    const saw = svg("text", { y: 13, "text-anchor": "middle", class: "t-saw" }, medal);
    saw.textContent = "ﷺ";
  }

  const labels = new Map<ForestNode, SVGTextElement>();
  function drawLabels() {
    labelLayer.replaceChildren();
    labels.clear();
    const taken: Box[] = [];
    const candidates = nodes
      .filter((node) => node.depth >= 0 && node.depth <= 5 && (node.depth === 0 || node.person.kind === "cheikh" || node === selected))
      .sort((a, b) => Number(b === selected) - Number(a === selected) || a.depth - b.depth || b.desc - a.desc);
    for (const node of candidates) {
      const size = (node.depth <= 1 ? 16 : 14) * textScale;
      const x = node.x + (node.depth === 0 ? 22 : 12);
      const textWidth = node.person.displayName.length * size * 0.48;
      const box = { x, y: node.y - 10 - size, width: textWidth, height: size * 1.3 };
      const clash = taken.some((other) =>
        box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + other.height && other.y < box.y + box.height);
      if (clash && node !== selected) continue;
      taken.push(box);
      const label = svg("text", { x, y: node.y - 10, class: node === selected ? "t-label t-label-chosen" : "t-label", style: `font-size:${size}px` }, labelLayer);
      label.textContent = node.person.displayName;
      labels.set(node, label);
    }
  }

  function restyle() {
    const chain = selected ? chainTo(selected) : null;
    const kept = selected && isolated ? new Set([...chain!, ...subtreeOf(selected)]) : null;
    const opacity = (node: ForestNode) => {
      if (kept) return kept.has(node) ? 1 : 0.12;
      if (chain) return chain.has(node) ? 1 : 0.55;
      if (generation !== null) return node.depth === generation ? 1 : 0.2;
      return 1;
    };
    bodies.forEach((group, node) => (group.style.opacity = String(opacity(node))));
    labels.forEach((label, node) => (label.style.opacity = String(Math.max(opacity(node), 0.35))));
    orbits.forEach((orbit, node) => {
      const golden = Boolean(chain?.has(node));
      orbit.style.stroke = golden ? "var(--gold)" : "var(--foreground)";
      orbit.style.strokeWidth = golden ? "1.4" : "0.8";
      orbit.style.opacity = String(golden ? 0.9 : 0.18 * opacity(node));
    });

    lineLayer.replaceChildren();
    markLayer.replaceChildren();
    if (chain && selected) {
      const points = [...chain].reverse().map((node) => `${node.x},${node.y}`).join(" ");
      svg("polyline", { points, class: "o-chain" }, lineLayer);
      svg("circle", { cx: selected.x, cy: selected.y, r: 16, class: "t-ring" }, markLayer);
      svg("circle", { cx: selected.x, cy: selected.y, r: 24, class: "t-ring t-ring-soft" }, markLayer);
    } else if (generation !== null) {
      for (const node of nodes) {
        if (node.depth !== generation) continue;
        const radius = 1.8 + Math.sqrt(node.desc) * 1.45;
        svg("circle", { cx: node.x, cy: node.y, r: radius + 7, class: "t-ring t-ring-thin" }, markLayer);
      }
    }
  }

  function select(personId: string | null) {
    selected = personId ? (forest?.byId.get(personId) ?? null) : null;
    if (!selected) isolated = false;
    drawLabels();
    restyle();
    if (selected) stage.reveal(selected.x, selected.y);
  }

  const textScale = Math.min(Math.max(0.8 / stage.fitted(), 1), 2.2);
  drawLabels();
  restyle();

  return {
    select,
    setIsolated(next) {
      isolated = next && Boolean(selected);
      restyle();
    },
    setGeneration(next) {
      generation = next;
      restyle();
    },
    zoom: stage.zoom,
    overview: () => stage.fit(true),
    reset() {
      select(null);
      options.onSelect(null);
      stage.fit(true);
    },
    dispose: stage.dispose,
  };
}
