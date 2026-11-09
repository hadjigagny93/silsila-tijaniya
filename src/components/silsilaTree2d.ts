import { buildForest, type ForestNode, hash, subtreeOf } from "@/lib/silsilaForest";
import { personImageUrl } from "./Avatar";
import { prefersCalm, type SceneApi, type SceneOptions, type TreeDisplay } from "./sceneTypes";
import { type Box, createSvgStage, svg } from "./svgStage";

const ROW = 84;
// Forces de l'arbre vivant : chaque branche est un ressort vers son maître, les personnes se
// repoussent, et chaque génération reste à sa hauteur pour que la graine garde le bas.
const SPRING = 0.03;
const SPRING_LENGTH = { branch: 78, leaf: 58 };
const REPULSION = 1400;
const REPULSION_RANGE = 170;
const HEIGHT_PULL = 0.014;
const SIDE_PULL = 0.0025;
const DAMPING = 0.82;
const COOLING = 0.992;
const REST = 0.02;
const MIN_WIDTH = 1100;
const LEAF_SPACE = 15;
// Chaînes à compléter, en bas : une rangée par génération dans chaque groupe, une place par bout de branche.
const STRAY_ROW = 70;
const STRAY_SPACE = 150;
const COLOR = { prophet: "var(--gold)", cheikh: "var(--gold)", mouqaddam: "var(--accent)", member: "var(--muted)" };
let instances = 0;

// Étoile à huit branches : deux carrés, dont l'un tourné de 45°.
function star(parent: Element, size: number, fill: string) {
  const group = svg("g", {}, parent);
  svg("rect", { x: -size, y: -size, width: size * 2, height: size * 2, style: `fill:${fill}` }, group);
  svg(
    "rect",
    { x: -size, y: -size, width: size * 2, height: size * 2, transform: "rotate(45)", style: `fill:${fill}` },
    group,
  );
  return group;
}

function defs(root: SVGSVGElement, id: string) {
  const definitions = svg("defs", {}, root);
  for (const [suffix, color, strength] of [
    ["g", "var(--gold)", 0.55],
    ["a", "var(--accent)", 0.45],
    ["q", "#2f8cff", 0.95],
  ] as const) {
    const gradient = svg("radialGradient", { id: id + suffix }, definitions);
    svg("stop", { offset: "0%", style: `stop-color:${color};stop-opacity:${strength}` }, gradient);
    svg("stop", { offset: "100%", style: `stop-color:${color};stop-opacity:0` }, gradient);
  }
  const clip = svg("clipPath", { id: id + "c", clipPathUnits: "objectBoundingBox" }, definitions);
  svg("circle", { cx: 0.5, cy: 0.5, r: 0.5 }, clip);
}

// Taille du disque (et de la photo) : les pôles spirituels (Qutb) sont agrandis.
function discRadius(person: ForestNode["person"]) {
  if (person.qutb) return person.kind === "member" ? 10 : 20;
  return person.kind === "cheikh" ? 13 : person.kind === "mouqaddam" ? 8.5 : 5;
}

// L'arbre de la maquette : le Prophète ﷺ en médaillon à la racine, le Cheikh au sommet du
// tronc, puis un éventail où chaque génération monte d'un cran.
export function createScene(options: SceneOptions): SceneApi {
  const forest = buildForest(options.persons);
  const id = `tree${instances++}`;
  const nodes = forest?.nodes ?? [];
  const founders = forest?.root.children ?? [];
  const maxDepth = Math.max(1, ...nodes.map((node) => node.depth));

  // Les bouts de branche se répartissent sur la largeur ; chaque nœud se place au milieu des siens.
  const leaves: ForestNode[] = [];
  const order = new Map<ForestNode, number>();
  const place = (node: ForestNode): number => {
    const value = node.children.length
      ? node.children.map(place).reduce((total, item) => total + item, 0) / node.children.length
      : (leaves.push(node), leaves.length - 1);
    order.set(node, value);
    return value;
  };
  founders.forEach(place);
  const width = Math.max(MIN_WIDTH, leaves.length * LEAF_SPACE);
  const center = width / 2;
  const top = 60;
  const base = top + maxDepth * ROW;
  const span = (depth: number) => width * (0.42 + 0.58 * (depth / maxDepth) ** 0.75);
  for (const node of nodes) {
    if (node.depth < 0) continue;
    const share = leaves.length > 1 ? order.get(node)! / (leaves.length - 1) - 0.5 : 0;
    node.x = node.depth === 0 && founders.length === 1 ? center : center + share * span(Math.max(node.depth, 1));
    node.y = base - node.depth * ROW + (node.depth > 0 ? hash(node.person.id) * 16 - 8 : 0);
    // Un bout de branche monte d'autant plus qu'il est loin du tronc : la ramure s'ouvre en éventail
    // au lieu de s'étaler à plat quand une génération compte beaucoup de monde.
    if (node.depth > 0 && !node.children.length) {
      const lift = (maxDepth - node.depth) * (0.2 + 0.8 * Math.abs(share * 2)) * 0.9;
      node.y -= lift * ROW;
    }
  }
  const prophetY = base + 120;
  if (forest) {
    forest.root.x = center;
    forest.root.y = prophetY;
  }

  // Chaînes à compléter : sous le médaillon, chaque groupe a son premier maillon en bas et, au-dessus de lui,
  // ceux qui ont pris de lui. Une personne seule reste un rond isolé. Les groupes se rangent côte à côte,
  // sur plusieurs rangées s'il le faut.
  const strays = forest?.strays ?? [];
  const strayTop = prophetY + 150;
  let strayBottom = prophetY + 90;
  {
    const groups = strays.map((root) => {
      const members = [...subtreeOf(root)];
      const slot = new Map<ForestNode, number>();
      let count = 0;
      const placeLocal = (node: ForestNode): number => {
        const value = node.children.length
          ? node.children.map(placeLocal).reduce((total, item) => total + item, 0) / node.children.length
          : count++;
        slot.set(node, value);
        return value;
      };
      placeLocal(root);
      const height = Math.max(...members.map((node) => node.depth)) - 1;
      return { members, slot, width: count * STRAY_SPACE, height };
    });
    const rowWidth = Math.max(width * 0.6, 600);
    let row: typeof groups = [];
    let y = strayTop;
    const flush = () => {
      if (!row.length) return;
      const ground = y + Math.max(...row.map((group) => group.height)) * STRAY_ROW;
      const total = row.reduce((sum, group) => sum + group.width, 0) + (row.length - 1) * STRAY_SPACE;
      let x = center - total / 2;
      for (const group of row) {
        for (const node of group.members) {
          node.x = x + (group.slot.get(node)! + 0.5) * STRAY_SPACE;
          node.y = ground - (node.depth - 1) * STRAY_ROW;
        }
        x += group.width + STRAY_SPACE;
      }
      // De la place pour le nom sous le rond.
      strayBottom = ground + 70;
      y = ground + STRAY_ROW + 24;
      row = [];
    };
    for (const group of groups) {
      if (row.length && row.reduce((sum, other) => sum + other.width + STRAY_SPACE, group.width) > rowWidth) flush();
      row.push(group);
    }
    flush();
  }

  // Point de départ de chaque personne : l'éventail, vers lequel « Réorganiser » la ramène.
  const home = new Map(nodes.map((node) => [node, { x: node.x, y: node.y }]));
  const motion = new Map(nodes.map((node) => [node, { vx: 0, vy: 0 }]));
  const pinned = new Set<ForestNode>();
  // Le Prophète ﷺ et le Cheikh sont fixes : la graine et le haut du tronc.
  const anchored = (node: ForestNode) => node.depth <= 0 || pinned.has(node);

  const content = (): Box => {
    const placed = nodes.filter((node) => node.depth >= 0);
    const xs = placed.map((node) => node.x);
    const ys = placed.map((node) => node.y);
    const left = Math.min(...xs, center - 300) - 60;
    const right = Math.max(...xs, center + 300) + 60;
    const upper = Math.min(...ys, top) - 50;
    return { x: left, y: upper, width: right - left, height: Math.max(prophetY + 90, strayBottom) - upper };
  };
  let selected: ForestNode | null = null;
  // « name » : tous les noms à la fois ; « photo » : seulement ceux qui n'ont pas de photo.
  let display: TreeDisplay = options.display ?? "photo";
  let generation = options.generation ?? null;

  const stage = createSvgStage(
    options.container,
    content,
    (tapped) => {
      select(tapped);
      options.onSelect(tapped && forest?.byId.has(tapped) ? tapped : null);
    },
    (personId, x, y) => grab(personId, x, y),
  );
  stage.root.setAttribute("aria-label", "Arbre de la silsila");
  defs(stage.root, id);
  const layer = (name: string) => svg("g", { class: name }, stage.world);
  const rootsLayer = layer("t-roots");
  const branchLayer = layer("t-branches");
  const silverLayer = layer("t-silvers");
  const goldFlowLayer = layer("t-gold-flows");
  const leafLayer = layer("t-leaves");
  const haloLayer = layer("t-halos");
  const nodeLayer = layer("t-nodes");
  const markLayer = layer("t-mark");
  const labelLayer = layer("t-labels");

  // Racines et tronc, du médaillon jusqu'au Cheikh.
  [-190, -130, -70, 0, 72, 142, 190].forEach((spread, index) => {
    const x = center + spread;
    const y = prophetY + 56 - Math.abs(spread) / 8;
    svg(
      "path",
      {
        d: `M${center} ${prophetY + 2} C ${center + spread * 0.2} ${prophetY + 20} ${x - spread * 0.3} ${y - 10} ${x} ${y}`,
        class: "t-root",
        style: `stroke-width:${3 - index * 0.25}`,
      },
      rootsLayer,
    );
  });
  if (forest && founders.length) {
    svg(
      "path",
      {
        d: `M${center - 22} ${prophetY + 6} C ${center - 12} ${prophetY - 40} ${center - 10} ${base + 40} ${center - 8} ${base}
          L ${center + 8} ${base} C ${center + 10} ${base + 40} ${center + 12} ${prophetY - 40} ${center + 22} ${prophetY + 6} Z`,
        class: "t-trunk",
      },
      rootsLayer,
    );
  }

  const branches = new Map<ForestNode, SVGPathElement>();
  const leafMarks = new Map<ForestNode, SVGElement[]>();
  for (const node of nodes) {
    if (node.depth < 1 || !node.parent) continue;
    const path = svg("path", { class: "t-branch" }, branchLayer);
    path.dataset.width = String(0.8 + Math.sqrt(node.desc + 1) * 1.25);
    branches.set(node, path);
    if (!node.children.length) {
      leafMarks.set(
        node,
        [0, 1].map(() => svg("ellipse", { rx: 3.4, ry: 8, class: "t-leaf" }, leafLayer)),
      );
    }
  }

  // Une traînée de lumière glisse le long de chaque chaîne, du maître qui donne vers celui qui reçoit :
  // jaune sur les chaînes dorées, argent sur les autres.
  const flowOf = (className: string, seed: string, parent: SVGGElement) => {
    const flow = svg("path", { class: className, pathLength: 100 }, parent);
    flow.style.animationDelay = `${-hash(seed) * 3}s`;
    return flow;
  };
  const goldFlows = new Map<ForestNode, SVGPathElement>();
  branches.forEach((_, node) => goldFlows.set(node, flowOf("t-gold-flow", node.person.id, goldFlowLayer)));

  // Chaînes argentées : une branche grise du maître vers le disciple, en plus de la branche dorée.
  const silvers: { master: ForestNode; node: ForestNode; path: SVGPathElement; flow: SVGPathElement }[] = [];
  const silverMasters = new Map<ForestNode, ForestNode[]>();
  const silverDisciples = new Map<ForestNode, ForestNode[]>();
  for (const node of nodes) {
    for (const masterId of node.person.alsoFrom ?? []) {
      const master = forest?.byId.get(masterId);
      if (!master || master === node) continue;
      const path = svg("path", { class: "t-silver" }, silverLayer);
      path.dataset.width = String(0.8 + Math.sqrt(node.desc + 1) * 1.25);
      silvers.push({ master, node, path, flow: flowOf("t-silver-flow", node.person.id + masterId, silverLayer) });
      silverMasters.set(node, [...(silverMasters.get(node) ?? []), master]);
      silverDisciples.set(master, [...(silverDisciples.get(master) ?? []), node]);
    }
  }

  // Tout ce qui mène à une personne (ses maîtres, dorés et argentés, jusqu'au Prophète ﷺ)
  // et tout ce qui part d'elle (ses disciples, et les leurs).
  function spread(start: ForestNode, next: (node: ForestNode) => (ForestNode | null | undefined)[]) {
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      for (const other of next(stack.pop()!)) {
        if (other && !seen.has(other)) {
          seen.add(other);
          stack.push(other);
        }
      }
    }
    return seen;
  }

  // La même courbe que les branches, du maître vers le disciple.
  function curve(from: ForestNode, to: ForestNode) {
    const dy = from.y - to.y;
    return `M${from.x} ${from.y} C ${from.x} ${from.y - dy * 0.62} ${to.x} ${to.y + dy * 0.45} ${to.x} ${to.y}`;
  }
  const branchPath = (node: ForestNode) => curve(node.parent!, node);

  // Médaillon du Prophète ﷺ et étoile du Cheikh.
  if (forest) {
    const medal = svg(
      "g",
      { transform: `translate(${center} ${prophetY}) scale(0.8)`, "data-id": forest.root.person.id, class: "t-hit" },
      stage.world,
    );
    svg("circle", { r: 90, fill: `url(#${id}g)` }, medal);
    svg("circle", { r: 34, class: "t-medal" }, medal);
    svg("circle", { r: 28, class: "t-medal-inner" }, medal);
    const saw = svg("text", { y: 13, "text-anchor": "middle", class: "t-saw" }, medal);
    saw.textContent = "ﷺ";
    const caption = svg(
      "text",
      { x: center, y: prophetY + 58, "text-anchor": "middle", class: "t-caption" },
      labelLayer,
    );
    caption.textContent = "LE PROPHÈTE MUḤAMMAD ﷺ";
    if (strays.length) {
      const pending = svg(
        "text",
        { x: center, y: strayTop - 34, "text-anchor": "middle", class: "t-caption" },
        labelLayer,
      );
      pending.textContent = "CHAÎNES À COMPLÉTER";
    }
  }

  const marks = new Map<ForestNode, SVGGElement>();
  function drawNodes() {
    nodeLayer.replaceChildren();
    marks.clear();
    for (const node of nodes) {
      if (node.depth < 0) continue;
      const kind = node.person.kind;
      const group = svg("g", { "data-id": node.person.id, class: "t-hit" }, nodeLayer);
      // Pôle spirituel (Qutb) : photo agrandie, et un halo bleu vif qui respire autour.
      const radius = discRadius(node.person);
      svg("circle", { r: Math.max(12, radius), class: "t-target" }, group);
      if (node.person.qutb) {
        svg("circle", { r: node.depth === 0 ? 30 : radius * 2.2, fill: `url(#${id}q)`, class: "t-qutb" }, group);
      }
      if (node.depth === 0) {
        svg("circle", { r: 46, fill: `url(#${id}g)` }, group);
        star(group, 11, "var(--gold)");
      } else {
        const qutb = node.person.qutb ? " t-disc-qutb" : "";
        svg("circle", { r: radius, class: `t-disc t-disc-${kind}${qutb}`, style: `stroke:${COLOR[kind]}` }, group);
        if (node.person.hasImage && radius > 6) {
          const image = svg(
            "image",
            {
              href: personImageUrl(node.person),
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
      }
      const title = svg("title", {}, group);
      title.textContent = node.person.displayName;
      marks.set(node, group);
    }
    draw(performance.now());
  }

  // Noms permanents : le Cheikh, la personne choisie, et les mouqaddams et cheikhs sans photo, sans chevauchement,
  // les plus portants d'abord. Les autres montrent leur nom au survol de leur photo.
  const labels = new Map<ForestNode, SVGTextElement>();
  function drawLabels() {
    labelLayer.querySelectorAll(".t-label").forEach((label) => label.remove());
    labels.clear();
    const taken: Box[] = [];
    const candidates = nodes
      .filter(
        (node) =>
          display === "name" ||
          node.depth === 0 ||
          node === selected ||
          (node.person.kind !== "member" && !node.person.hasImage),
      )
      .sort((a, b) => Number(b === selected) - Number(a === selected) || a.depth - b.depth || b.desc - a.desc);
    for (const node of candidates) {
      if (node.depth < 0) continue;
      const size = (node.depth === 0 ? 19 : node.person.kind === "member" ? 12.5 : 15.5) * textScale;
      const left = node.depth > 0 && node.x < center;
      const offset = (node.person.qutb ? 26 : 18) * textScale;
      // Chaînes à compléter : le nom sous le rond, centré, pour que les groupes voisins ne se gênent pas.
      const below = Boolean(node.stray);
      const x = below ? node.x : node.depth === 0 ? node.x + 18 : left ? node.x - offset : node.x + offset;
      const y = below ? node.y + discRadius(node.person) + size : node.y + 5;
      const label = svg(
        "text",
        {
          x,
          y,
          "text-anchor": below ? "middle" : left ? "end" : "start",
          class: node === selected ? "t-label t-label-chosen" : "t-label",
          style: `font-size:${size}px`,
        },
        labelLayer,
      );
      label.textContent = node.person.displayName;
      // La vraie largeur du nom, avec un peu d'air autour ; un nom qui en chevauche un autre attend le survol.
      const gap = 4 * textScale;
      const textWidth = label.getComputedTextLength() || node.person.displayName.length * size * 0.5;
      const box = {
        x: (below ? x - textWidth / 2 : left ? x - textWidth : x) - gap,
        y: y - 5 - size - gap / 2,
        width: textWidth + gap * 2,
        height: size * 1.3 + gap,
      };
      const clash = taken.some(
        (other) =>
          box.x < other.x + other.width &&
          other.x < box.x + box.width &&
          box.y < other.y + other.height &&
          other.y < box.y + box.height,
      );
      // Tous les noms demandés : on les montre même serrés, il suffit de zoomer pour les lire.
      if (clash && node !== selected && display !== "name") {
        label.remove();
        continue;
      }
      taken.push(box);
      label.dataset.offset = String(x - node.x);
      label.dataset.rise = String(y - node.y);
      labels.set(node, label);
    }
  }

  function restyle() {
    // Une personne choisie : on ne garde que les chaînes qui viennent à elle et qui partent d'elle, le reste disparaît.
    const up = selected ? spread(selected, (node) => [node.parent, ...(silverMasters.get(node) ?? [])]) : null;
    const down = selected ? spread(selected, (node) => [...node.children, ...(silverDisciples.get(node) ?? [])]) : null;
    const kept = (node: ForestNode) => !up || node.depth < 0 || up.has(node) || down!.has(node);
    // Une chaîne reste si elle mène à la personne, ou si elle part d'elle ou de l'un de ses disciples.
    const linked = (master: ForestNode, node: ForestNode) => !up || up.has(node) || down!.has(master);
    const show = (element: SVGElement, on: boolean) => (element.style.display = on ? "" : "none");
    const opacity = (node: ForestNode) =>
      generation !== null && !selected ? (node.depth === generation && !node.stray ? 1 : 0.2) : 1;

    branches.forEach((path, node) => {
      const on = linked(node.parent!, node);
      const base = Number(path.dataset.width);
      show(path, on);
      show(goldFlows.get(node)!, on);
      path.style.stroke = selected ? "var(--gold)" : "var(--foreground)";
      path.style.strokeWidth = String(selected ? base + 1.6 : base);
      path.style.opacity = String((selected ? 1 : 0.5) * opacity(node));
      goldFlows.get(node)!.style.strokeWidth = String(base + (selected ? 2.4 : 1));
    });
    for (const { master, node, path, flow } of silvers) {
      const on = linked(master, node);
      const base = Number(path.dataset.width);
      show(path, on);
      show(flow, on);
      path.style.strokeWidth = String(selected ? base + 1.6 : base);
      path.style.opacity = String((selected ? 1 : 0.6) * Math.min(opacity(node), opacity(master)));
      flow.style.strokeWidth = String(base + (selected ? 2.4 : 1));
    }
    leafMarks.forEach((items, node) =>
      items.forEach((item) => {
        show(item, kept(node));
        item.style.opacity = String(0.3 * opacity(node));
      }),
    );
    marks.forEach((group, node) => {
      show(group, kept(node));
      group.style.opacity = String(opacity(node));
    });
    labels.forEach((label, node) => {
      show(label, kept(node));
      label.style.opacity = String(Math.max(opacity(node), 0.35));
    });

    haloLayer.replaceChildren();
    halos.clear();
    if (generation !== null && !selected) {
      for (const node of nodes) {
        if (node.depth === generation && !node.stray)
          halos.set(node, svg("circle", { r: 16, fill: `url(#${id}a)` }, haloLayer));
      }
    }
    markLayer.replaceChildren();
    rings =
      selected && selected.depth >= 0
        ? [
            svg("circle", { r: 20, class: "t-ring" }, markLayer),
            svg("circle", { r: 28, class: "t-ring t-ring-soft" }, markLayer),
          ]
        : [];
    draw(performance.now());
  }

  const halos = new Map<ForestNode, SVGElement>();
  let rings: SVGElement[] = [];

  // Met le dessin à la position courante de chacun ; les feuilles frémissent doucement.
  function draw(now: number) {
    marks.forEach((group, node) => group.setAttribute("transform", `translate(${node.x} ${node.y})`));
    branches.forEach((path, node) => {
      const d = branchPath(node);
      path.setAttribute("d", d);
      goldFlows.get(node)!.setAttribute("d", d);
    });
    for (const { master, node, path, flow } of silvers) {
      const d = curve(master, node);
      path.setAttribute("d", d);
      flow.setAttribute("d", d);
    }
    leafMarks.forEach((items, node) => {
      const sway = calm ? 0 : Math.sin(now / 900 + hash(node.person.id) * 6) * 7;
      const angle = hash(node.person.id + "f") * 360 + sway;
      items.forEach((item, index) => {
        item.setAttribute("cx", String(node.x));
        item.setAttribute("cy", String(node.y - 7));
        item.setAttribute("transform", `rotate(${angle + index * 120} ${node.x} ${node.y})`);
      });
    });
    labels.forEach((label, node) => {
      label.setAttribute("x", String(node.x + Number(label.dataset.offset)));
      label.setAttribute("y", String(node.y + Number(label.dataset.rise)));
    });
    halos.forEach((halo, node) => {
      halo.setAttribute("cx", String(node.x));
      halo.setAttribute("cy", String(node.y));
    });
    if (selected) {
      for (const ring of rings) {
        ring.setAttribute("cx", String(selected.x));
        ring.setAttribute("cy", String(selected.y));
      }
    }
  }

  // Un pas de la simulation : ressorts, répulsion, hauteur de génération.
  function step(alpha: number) {
    // Les chaînes à compléter restent posées en bas, hors de la simulation.
    const moving = nodes.filter((node) => node.depth >= 1 && !node.stray);
    for (let first = 0; first < moving.length; first++) {
      const a = moving[first];
      const pushA = motion.get(a)!;
      for (let second = first + 1; second < moving.length; second++) {
        const b = moving[second];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > REPULSION_RANGE || Math.abs(dy) > REPULSION_RANGE) continue;
        const distance = Math.max(Math.hypot(dx, dy), 4);
        if (distance > REPULSION_RANGE) continue;
        const force = (REPULSION / (distance * distance)) * alpha;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        pushA.vx += fx;
        pushA.vy += fy;
        const pushB = motion.get(b)!;
        pushB.vx -= fx;
        pushB.vy -= fy;
      }
    }
    for (const node of moving) {
      const push = motion.get(node)!;
      const parent = node.parent!;
      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const rest = node.children.length ? SPRING_LENGTH.branch : SPRING_LENGTH.leaf;
      const pull = (distance - rest) * SPRING * alpha;
      push.vx -= (dx / distance) * pull;
      push.vy -= (dy / distance) * pull;
      if (!anchored(parent)) {
        const parentPush = motion.get(parent)!;
        parentPush.vx += (dx / distance) * pull * 0.5;
        parentPush.vy += (dy / distance) * pull * 0.5;
      }
      const target = home.get(node)!;
      push.vy += (target.y - node.y) * HEIGHT_PULL * alpha;
      push.vx += (target.x - node.x) * SIDE_PULL * alpha;
    }
    for (const node of moving) {
      const push = motion.get(node)!;
      if (anchored(node)) {
        push.vx = 0;
        push.vy = 0;
        continue;
      }
      push.vx *= DAMPING;
      push.vy *= DAMPING;
      node.x += push.vx;
      node.y += push.vy;
      // Rien ne descend sous le haut du tronc : la graine reste en bas.
      node.y = Math.min(node.y, base - 24);
    }
  }

  let alpha = 1;
  let frame = 0;
  let wasMoving = false;
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (alpha > REST) {
      step(alpha);
      alpha *= COOLING;
      wasMoving = true;
    } else if (wasMoving) {
      // L'arbre s'est posé : les noms se redistribuent sans se chevaucher.
      wasMoving = false;
      drawLabels();
      restyle();
    }
    draw(now);
  }

  function heat(level: number) {
    alpha = Math.max(alpha, level);
  }

  // Saisir une personne la déplace avec toute sa branche ; elle reste où on la pose.
  function grab(personId: string, x: number, y: number) {
    const node = forest?.byId.get(personId);
    if (!node || node.depth < 1 || node.stray) return null;
    const branch = [...subtreeOf(node)];
    let last = { x, y };
    pinned.add(node);
    return {
      move(nextX: number, nextY: number) {
        const dx = nextX - last.x;
        const dy = nextY - last.y;
        last = { x: nextX, y: nextY };
        for (const member of branch) {
          if (member !== node && pinned.has(member)) continue;
          member.x += dx;
          member.y = Math.min(member.y + dy, base - 24);
        }
        heat(0.35);
      },
      end() {
        heat(0.3);
      },
    };
  }

  // Le nom de la personne survolée apparaît, même si elle n'a pas de nom permanent.
  const hover = svg("text", { class: "t-label t-label-hover" }, stage.world);
  stage.root.addEventListener("pointerover", (event) => {
    const target = (event.target as Element).closest<SVGElement>("[data-id]");
    const node = target?.dataset.id ? forest?.byId.get(target.dataset.id) : undefined;
    if (!node || node.depth < 0 || labels.has(node)) {
      hover.textContent = "";
      return;
    }
    const left = node.x < center;
    hover.setAttribute("x", String(left ? node.x - 16 * textScale : node.x + 16 * textScale));
    hover.setAttribute("y", String(node.y + 5));
    hover.setAttribute("text-anchor", left ? "end" : "start");
    hover.textContent = node.person.displayName;
  });
  stage.root.addEventListener("pointerleave", () => (hover.textContent = ""));

  function select(personId: string | null) {
    selected = personId ? (forest?.byId.get(personId) ?? null) : null;
    hover.textContent = "";
    drawLabels();
    restyle();
    if (selected) stage.reveal(selected.x, selected.y);
  }

  // Les noms gardent une taille lisible quand l'arbre entier tient à l'écran.
  const calm = prefersCalm();
  const textScale = Math.min(Math.max(0.8 / stage.fitted(), 1), 2.2);
  hover.style.fontSize = `${15.5 * textScale}px`;
  // Sans animation demandée, l'arbre se pose d'un coup.
  if (calm) {
    while (alpha > REST) {
      step(alpha);
      alpha *= COOLING;
    }
  }
  drawNodes();
  drawLabels();
  restyle();
  stage.fit(false);
  frame = requestAnimationFrame(tick);

  return {
    select,
    setDisplay(next) {
      display = next;
      drawLabels();
      restyle();
    },
    setGeneration(next) {
      generation = next;
      restyle();
    },
    setExploring: stage.setExploring,
    rearrange() {
      pinned.clear();
      home.forEach((point, node) => {
        if (node.depth < 1 || node.stray) return;
        node.x = point.x + (hash(node.person.id + "r") - 0.5) * 30;
        node.y = point.y;
      });
      heat(1);
    },
    zoom: stage.zoom,
    overview: () => stage.fit(true),
    reset() {
      select(null);
      options.onSelect(null);
      stage.fit(true);
    },
    dispose() {
      cancelAnimationFrame(frame);
      stage.dispose();
    },
  };
}
