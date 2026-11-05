import { generationsOf } from "@/lib/chain";
import { initialsOf } from "@/lib/names";
import { CARD_HEIGHT, layoutPyramid, LINK, type PyramidCell, SHELF, SQUARE } from "@/lib/silsilaPyramid";
import { t } from "@/messages/fr";
import { personImageUrl } from "./Avatar";
import { attachPinch } from "./pinch";
import { prefersCalm, type SceneApi, type SceneOptions } from "./sceneTypes";

const SIDE_MARGIN = 24;
// Colonne des repères de génération, à gauche de la pyramide.
const RULER = 62;
const RULER_MIN_GAP = 15;
const BOTTOM_MARGIN = 112;
const TOP_MARGIN = 40;
const MAX_SCALE = 2.5;
const FOCUS_SCALE = 1;
// En dessous, les noms seraient illisibles : on ne laisse que les photos.
const NAME_SCALE = 0.42;

function buildCell(cell: PyramidCell, row: number, founder: boolean) {
  const button = document.createElement("button");
  button.className = "pyramid-cell";
  button.dataset.id = cell.person.id;
  button.dataset.kind = founder ? "founder" : cell.person.kind;
  button.dataset.connected = String(cell.connected);
  button.setAttribute("aria-label", cell.person.displayName);
  button.title = cell.person.displayName;
  button.style.left = `${cell.left}px`;
  button.style.top = `${cell.top}px`;
  button.style.width = `${SQUARE}px`;
  button.style.height = `${CARD_HEIGHT}px`;
  button.style.animationDelay = `${row * 60}ms`;

  // Le haut de la carte : ﷺ pour le Prophète, l'étoile pour le Cheikh, sinon photo ou initiales.
  const picture = document.createElement("span");
  picture.className = "pyramid-picture";
  if (cell.person.kind === "prophet") {
    picture.classList.add("pyramid-saw");
    picture.textContent = "ﷺ";
  } else if (founder) {
    picture.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="5" width="14" height="14" fill="currentColor"/><rect x="5" y="5" width="14" height="14" fill="currentColor" transform="rotate(45 12 12)"/></svg>';
  } else if (cell.person.hasImage) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.draggable = false;
    image.src = personImageUrl(cell.person);
    picture.appendChild(image);
  } else {
    picture.classList.add("pyramid-initials");
    picture.textContent = initialsOf(cell.person.displayName);
  }
  button.appendChild(picture);
  const name = document.createElement("span");
  name.className = "pyramid-name";
  name.textContent = cell.person.kind === "prophet" ? t.silsila.prophetShort : cell.person.displayName;
  button.appendChild(name);
  return button;
}

export function createScene(options: SceneOptions): SceneApi {
  const { container, persons, onSelect } = options;
  const { cells, shelves, links, width, height, stripTop } = layoutPyramid(persons);
  const calm = prefersCalm();
  const generations = generationsOf(persons);
  let generation = options.generation ?? null;

  const frame = document.createElement("div");
  frame.className = "pyramid-frame";
  const world = document.createElement("div");
  world.className = "pyramid-world";
  world.style.width = `${width}px`;
  world.style.height = `${height}px`;
  frame.appendChild(world);

  function addLine(
    owner: PyramidCell,
    golden: (chain: Set<PyramidCell>) => boolean,
    left: number,
    top: number,
    lineWidth: number,
    lineHeight: number,
  ) {
    const element = document.createElement("i");
    element.className = "pyramid-line";
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${lineWidth}px`;
    element.style.height = `${lineHeight}px`;
    world.appendChild(element);
    return { owner, element, golden };
  }

  const lineElements = [
    ...shelves.map((shelf) => {
      // Un seul héritier : la ligne de base se réduit au trait vertical, sans bosse.
      const overhang = shelf.width > 0 ? 18 : SHELF / 2;
      const golden = (chain: Set<PyramidCell>) =>
        chain.has(shelf.owner) && shelf.owner.children.some((child) => chain.has(child));
      return addLine(shelf.owner, golden, shelf.left - overhang, shelf.top, shelf.width + overhang * 2, SHELF);
    }),
    ...links.map((link) =>
      addLine(
        link.owner,
        (chain) => chain.has(link.owner) && (link.owner.parent === null || chain.has(link.owner.parent)),
        link.left - SHELF / 2,
        link.top,
        SHELF,
        LINK,
      ),
    ),
  ];
  const founders = new Set(cells.filter((cell) => cell.parent?.person.kind === "prophet"));
  const cellElements = new Map(
    cells.map((cell) => {
      const element = buildCell(cell, cell.row, founders.has(cell));
      world.appendChild(element);
      return [cell, element] as const;
    }),
  );
  const byId = new Map(cells.map((cell) => [cell.person.id, cell]));

  if (stripTop !== null) {
    const caption = document.createElement("p");
    caption.className = "pyramid-caption";
    caption.textContent = t.silsila.pending;
    caption.style.top = `${stripTop}px`;
    world.appendChild(caption);
  }

  const rows = new Map<number, number>();
  for (const cell of cells) {
    const rank = generations.get(cell.person.id);
    if (rank !== undefined) rows.set(rank, cell.top);
  }
  // Le rang 0 est celui du Cheikh : « Aux origines ».
  const founderRow = [...founders][0];
  if (founderRow) rows.set(0, founderRow.top);
  const ruler = [...rows]
    .sort(([a], [b]) => a - b)
    .map(([rank, top]) => {
      const element = document.createElement("span");
      element.className = "pyramid-rank";
      element.textContent = rank === 0 ? t.biographies.origins : t.silsila.generationShort(rank);
      frame.appendChild(element);
      return { rank, top, element };
    });
  const rowGap = ruler.length > 1 ? Math.abs(ruler[1].top - ruler[0].top) : CARD_HEIGHT;

  const view = { x: 0, y: 0, scale: 1 };
  let fitted = 1;
  let selected: PyramidCell | null = null;
  let moved = false;

  function apply(glide: boolean) {
    world.classList.toggle("is-gliding", glide && !calm);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    world.dataset.far = String(view.scale < NAME_SCALE);
    // Quand les rangées sont trop serrées, un repère sur deux ou trois suffit.
    const stride = Math.ceil(RULER_MIN_GAP / (rowGap * view.scale));
    for (const { rank, top, element } of ruler) {
      element.style.top = `${view.y + (top + CARD_HEIGHT / 2) * view.scale}px`;
      element.dataset.current = String(rank === generation);
      element.hidden = rank !== generation && rank > 0 && (rank - 1) % stride !== 0;
    }
  }

  function fit(glide: boolean) {
    const top = TOP_MARGIN;
    const room = container.clientHeight - top - BOTTOM_MARGIN;
    const roomWide = container.clientWidth - SIDE_MARGIN * 2 - RULER;
    fitted = Math.min(roomWide / width, room / height, 1);
    view.scale = fitted;
    view.x = RULER + (container.clientWidth - RULER - width * fitted) / 2;
    view.y = top + (room - height * fitted) / 2;
    moved = false;
    apply(glide);
  }

  function zoomAt(scale: number, x: number, y: number, glide: boolean) {
    const next = Math.min(Math.max(scale, fitted * 0.7), MAX_SCALE);
    view.x = x - ((x - view.x) / view.scale) * next;
    view.y = y - ((y - view.y) / view.scale) * next;
    view.scale = next;
    moved = true;
    apply(glide);
  }

  // Cadre la rangée choisie : une génération peu nombreuse devient lisible d'un coup.
  function frameGeneration() {
    const members = cells.filter((cell) => generations.get(cell.person.id) === generation);
    if (members.length === 0) return fit(true);
    const left = Math.min(...members.map((cell) => cell.left));
    const right = Math.max(...members.map((cell) => cell.left)) + SQUARE;
    const roomWide = container.clientWidth - SIDE_MARGIN * 2 - RULER;
    view.scale = Math.max(Math.min(roomWide / (right - left), 1), fitted);
    view.x = RULER + (container.clientWidth - RULER) / 2 - ((left + right) / 2) * view.scale;
    view.y = container.clientHeight / 2 - (members[0].top + CARD_HEIGHT / 2) * view.scale;
    moved = true;
    apply(true);
  }

  function highlight(cell: PyramidCell | null) {
    const kept = new Set<PyramidCell>();
    const chain = new Set<PyramidCell>();
    for (let cursor = cell; cursor; cursor = cursor.parent) {
      kept.add(cursor);
      chain.add(cursor);
    }
    const addAbove = (node: PyramidCell) => {
      for (const child of node.children) {
        kept.add(child);
        addAbove(child);
      }
    };
    if (cell) addAbove(cell);
    else if (generation !== null) {
      // La rangée et tout ce qui la porte, jusqu'au Prophète ﷺ.
      for (const owner of cells) {
        if (generations.get(owner.person.id) !== generation) continue;
        for (let cursor: PyramidCell | null = owner; cursor; cursor = cursor.parent) kept.add(cursor);
      }
    }
    const filtered = Boolean(cell) || generation !== null;

    cellElements.forEach((element, owner) => {
      element.dataset.dim = String(filtered && !kept.has(owner));
      element.dataset.chain = String(chain.has(owner) && owner !== cell);
      element.setAttribute("aria-pressed", String(owner === cell));
    });
    // La lignée de la personne choisie se lit en or, jusqu'au Prophète ﷺ.
    for (const { owner, element, golden } of lineElements) {
      element.dataset.dim = String(filtered && !kept.has(owner));
      element.dataset.chain = String(golden(chain));
    }
  }

  function select(id: string | null) {
    selected = id ? (byId.get(id) ?? null) : null;
    highlight(selected);
    if (!selected) return;
    view.scale = Math.max(view.scale, FOCUS_SCALE);
    view.x = container.clientWidth / 2 - (selected.left + SQUARE / 2) * view.scale;
    view.y = container.clientHeight / 2 - (selected.top + CARD_HEIGHT / 2) * view.scale;
    moved = true;
    apply(true);
  }

  function choose(id: string | null) {
    select(id);
    onSelect(id);
  }

  let press: { x: number; y: number; viewX: number; viewY: number } | null = null;
  let dragging = false;
  // Deux doigts : zoom par pincement, sans glissé ni choix de case.
  const pinch = attachPinch(
    frame,
    view,
    (scale) => Math.min(Math.max(scale, fitted * 0.7), MAX_SCALE),
    () => {
      moved = true;
      press = null;
      apply(false);
    },
  );

  function onDown(event: PointerEvent) {
    if (pinch.active()) {
      press = null;
      return;
    }
    press = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
    dragging = false;
  }

  function onMove(event: PointerEvent) {
    if (!press || pinch.active()) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!dragging && Math.hypot(dx, dy) < 6) return;
    if (!dragging) frame.setPointerCapture(event.pointerId);
    dragging = true;
    view.x = press.viewX + dx;
    view.y = press.viewY + dy;
    moved = true;
    apply(false);
  }

  function onUp(event: PointerEvent) {
    if (press && !dragging) {
      const target = (event.target as HTMLElement).closest<HTMLElement>(".pyramid-cell");
      choose(target?.dataset.id ?? null);
    }
    press = null;
  }

  // Le clavier déclenche un clic sans pointeur : detail vaut alors 0.
  function onClick(event: MouseEvent) {
    if (event.detail !== 0) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>(".pyramid-cell");
    if (target) choose(target.dataset.id ?? null);
  }

  // La molette doit faire défiler la page ; ctrl + molette (ou le pincement) zoome.
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const bounds = frame.getBoundingClientRect();
    zoomAt(view.scale * Math.exp(-event.deltaY / 200), event.clientX - bounds.left, event.clientY - bounds.top, false);
  }

  frame.addEventListener("pointerdown", onDown);
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerup", onUp);
  frame.addEventListener("pointercancel", onUp);
  frame.addEventListener("click", onClick);
  frame.addEventListener("wheel", onWheel, { passive: false });

  container.appendChild(frame);
  fit(false);
  if (generation !== null) {
    highlight(null);
    frameGeneration();
  }

  const resizeObserver = new ResizeObserver(() => {
    if (!moved) fit(false);
  });
  resizeObserver.observe(container);

  return {
    select,
    setGeneration(next) {
      generation = next;
      selected = null;
      highlight(null);
      if (next === null) fit(true);
      else frameGeneration();
    },
    zoom(factor) {
      zoomAt(view.scale / factor, container.clientWidth / 2, container.clientHeight / 2, true);
    },
    overview() {
      fit(true);
    },
    reset() {
      choose(null);
      fit(true);
    },
    dispose() {
      pinch.dispose();
      resizeObserver.disconnect();
      frame.remove();
    },
  };
}
