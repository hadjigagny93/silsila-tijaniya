import { attachPinch } from "./pinch";
import { prefersCalm } from "./sceneTypes";

export const SVG = "http://www.w3.org/2000/svg";

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  parent?: Element,
) {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  parent?.appendChild(element);
  return element;
}

export type Box = { x: number; y: number; width: number; height: number };

// Marges que la scène laisse libres : titre et recherche en haut, barre de vues en bas.
const INSETS = { top: 40, right: 24, bottom: 112, left: 24 };
const MAX_SCALE = 4;
// Ralentissement du glissé une fois le doigt levé, comme sur un tableau blanc.
const FRICTION = 0.92;
// Élan maximal d'un glissé lancé (pixels par image) : un geste vif ne projette pas le dessin hors de l'écran.
const MAX_SPEED = 38;
// Au doigt, il faut appuyer un moment sur une personne pour la déplacer ; sinon on fait glisser tout le dessin.
const HOLD_TO_GRAB = 450;
// Part du dessin qui reste toujours à l'écran, quoi qu'on fasse.
const KEEP_VISIBLE = 90;

// Saisie d'un élément du dessin : reçoit la position du pointeur dans le repère du dessin.
export type Grab = { move(x: number, y: number): void; end(): void };

// Socle des vues 2D : un dessin que l'on fait glisser et que l'on zoome, avec un clic
// qui désigne la personne sous le pointeur (un élément portant data-id).
export function createSvgStage(
  container: HTMLElement,
  content: Box | (() => Box),
  onTap: (id: string | null) => void,
  grab?: (id: string, x: number, y: number) => Grab | null,
  // La carte du monde zoome bien plus loin que l'arbre, et redessine ses repères à chaque changement d'échelle.
  // stretch : sur téléphone, de combien la vue d'ensemble peut déborder en largeur (l'arbre, très large, en profite).
  options: { maxScale?: number; stretch?: number; onView?: (scale: number) => void } = {},
) {
  const maxScale = options.maxScale ?? MAX_SCALE;
  const calm = prefersCalm();
  const insets = { ...INSETS };
  const box = () => (typeof content === "function" ? content() : content);
  // En exploration, la molette et le pavé tactile déplacent le dessin au lieu de la page.
  let wheelPans = false;
  const root = svg("svg", { class: "svg-stage", role: "img" });
  const world = svg("g", { class: "svg-world" }, root);
  container.appendChild(root);

  const view = { x: 0, y: 0, scale: 1 };
  let fitted = 1;
  let moved = false;

  // Le dessin ne quitte jamais tout à fait l'écran : un bord reste visible, on le retrouve toujours.
  function keepInside() {
    const area = box();
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height || !Number.isFinite(view.scale) || view.scale <= 0) return;
    const left = view.x + area.x * view.scale;
    const top = view.y + area.y * view.scale;
    const right = left + area.width * view.scale;
    const bottom = top + area.height * view.scale;
    const keepX = Math.min(KEEP_VISIBLE, (right - left) / 2);
    const keepY = Math.min(KEEP_VISIBLE, (bottom - top) / 2);
    if (right < keepX) view.x += keepX - right;
    else if (left > width - keepX) view.x -= left - (width - keepX);
    if (bottom < keepY) view.y += keepY - bottom;
    else if (top > height - keepY) view.y -= top - (height - keepY);
  }

  // Pendant qu'on manipule le dessin, ses lumières animées se figent : le téléphone n'a plus qu'à le déplacer.
  let settle = 0;
  function setMoving(next: boolean) {
    window.clearTimeout(settle);
    if (next) root.dataset.moving = "";
    else settle = window.setTimeout(() => delete root.dataset.moving, 180);
  }

  function apply(glide: boolean) {
    world.classList.toggle("is-gliding", glide && !calm);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    root.dataset.far = String(view.scale < 0.55);
    options.onView?.(view.scale);
  }

  // Sur téléphone, le titre, la recherche et la barre de vues prennent une bonne part de l'écran : on mesure
  // la place qu'ils laissent vraiment, plutôt que des marges fixes.
  let exploring = false;
  const narrowStretch = () => (container.clientWidth < 768 ? (options.stretch ?? 1) : 1);
  function margins() {
    if (container.clientWidth >= 768) return insets;
    const host = container.parentElement;
    const area = container.getBoundingClientRect();
    const head = exploring ? null : host?.querySelector("[data-tree-top]")?.getBoundingClientRect();
    const bar = host?.querySelector(".silsila-bar")?.getBoundingClientRect();
    return {
      top: head ? Math.max(insets.top, head.bottom - area.top + 12) : insets.top,
      right: 12,
      bottom: bar ? Math.max(24, area.bottom - bar.top + 12) : insets.bottom,
      left: 12,
    };
  }

  function frame(box: Box, glide: boolean, limit = 1.6, stretch = 1) {
    const edges = margins();
    const width = container.clientWidth - edges.left - edges.right;
    const height = container.clientHeight - edges.top - edges.bottom;
    // Vue d'ensemble sur téléphone : l'arbre, bien plus large que haut, deviendrait minuscule ; il peut déborder un peu sur
    // les côtés (il suffit de le faire glisser) pour garder des noms lisibles.
    view.scale = Math.min((width / box.width) * stretch, height / box.height, limit);
    view.x = edges.left + (width - box.width * view.scale) / 2 - box.x * view.scale;
    view.y = edges.top + (height - box.height * view.scale) / 2 - box.y * view.scale;
    apply(glide);
  }

  function fit(glide: boolean) {
    frame(box(), glide, 1.6, narrowStretch());
    fitted = view.scale;
    moved = false;
  }

  function zoomAt(scale: number, x: number, y: number, glide: boolean) {
    const next = Math.min(Math.max(scale, (fitted * 0.6) / narrowStretch()), maxScale);
    view.x = x - ((x - view.x) / view.scale) * next;
    view.y = y - ((y - view.y) / view.scale) * next;
    view.scale = next;
    moved = true;
    keepInside();
    apply(glide);
  }

  // Ramène un point dans la partie visible, sans changer le zoom s'il y est déjà.
  // Sur grand écran la carte de la personne est à droite ; sur téléphone, c'est un bandeau en bas.
  function reveal(x: number, y: number) {
    const narrow = container.clientWidth < 768;
    const edges = margins();
    const right = narrow ? 40 : 380;
    const bottom = narrow ? edges.bottom + 190 : insets.bottom + 20;
    const screenX = view.x + x * view.scale;
    const screenY = view.y + y * view.scale;
    const inside =
      screenX > edges.left + 40 &&
      screenX < container.clientWidth - right &&
      screenY > edges.top + 40 &&
      screenY < container.clientHeight - bottom;
    if (inside) return;
    view.x = (narrow ? container.clientWidth / 2 : (container.clientWidth - 360) / 2) - x * view.scale;
    view.y =
      (narrow ? (container.clientHeight - bottom + edges.top) / 2 : (container.clientHeight - insets.bottom) / 2) -
      y * view.scale;
    moved = true;
    apply(true);
  }

  function toWorld(event: PointerEvent) {
    const bounds = root.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left - view.x) / view.scale,
      y: (event.clientY - bounds.top - view.y) / view.scale,
    };
  }

  let press: {
    x: number;
    y: number;
    viewX: number;
    viewY: number;
    id: string | null;
    touch: boolean;
    time: number;
  } | null = null;
  let dragging = false;
  let held: Grab | null = null;
  let velocity = { x: 0, y: 0, time: 0 };
  let coasting = 0;

  function coast() {
    velocity.x *= FRICTION;
    velocity.y *= FRICTION;
    if (Math.hypot(velocity.x, velocity.y) < 0.3) return setMoving(false);
    view.x += velocity.x;
    view.y += velocity.y;
    keepInside();
    apply(false);
    coasting = requestAnimationFrame(coast);
  }

  // Deux doigts : zoom par pincement ; le glissé et le toucher s'effacent.
  const pinch = attachPinch(
    root,
    view,
    (scale) => Math.min(Math.max(scale, (fitted * 0.6) / narrowStretch()), maxScale),
    () => {
      moved = true;
      press = null;
      held?.end();
      held = null;
      setMoving(true);
      keepInside();
      apply(false);
    },
  );

  function onDown(event: PointerEvent) {
    cancelAnimationFrame(coasting);
    if (pinch.active()) {
      press = null;
      return;
    }
    const target = (event.target as Element).closest<SVGElement>("[data-id]");
    press = {
      x: event.clientX,
      y: event.clientY,
      viewX: view.x,
      viewY: view.y,
      id: target?.dataset.id ?? null,
      touch: event.pointerType !== "mouse",
      time: performance.now(),
    };
    dragging = false;
    held = null;
    velocity = { x: 0, y: 0, time: performance.now() };
  }

  function onMove(event: PointerEvent) {
    if (!press || pinch.active()) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!dragging && Math.hypot(dx, dy) < 6) return;
    if (!dragging) {
      root.setPointerCapture(event.pointerId);
      dragging = true;
      setMoving(true);
      // Saisir une personne la déplace ; saisir le fond déplace tout le dessin. Au doigt, un glissé rapide
      // déplace toujours le dessin : on ne bouscule pas une branche en voulant simplement se promener.
      const grabbing = !press.touch || performance.now() - press.time >= HOLD_TO_GRAB;
      if (press.id && grab && grabbing) {
        const point = toWorld(event);
        held = grab(press.id, point.x, point.y);
      }
    }
    if (held) {
      const point = toWorld(event);
      held.move(point.x, point.y);
      return;
    }
    const now = performance.now();
    const nextX = press.viewX + dx;
    const nextY = press.viewY + dy;
    // Élan lissé et plafonné : des événements très rapprochés ne donnent pas une vitesse démesurée.
    const elapsed = Math.max(now - velocity.time, 8);
    const speedX = ((nextX - view.x) / elapsed) * 16;
    const speedY = ((nextY - view.y) / elapsed) * 16;
    const smoothX = velocity.x * 0.4 + speedX * 0.6;
    const smoothY = velocity.y * 0.4 + speedY * 0.6;
    const speed = Math.hypot(smoothX, smoothY);
    const cap = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
    velocity = { x: smoothX * cap, y: smoothY * cap, time: now };
    view.x = nextX;
    view.y = nextY;
    moved = true;
    keepInside();
    apply(false);
  }

  function onUp(event: PointerEvent) {
    if (press && !dragging) {
      onTap(press.id);
    } else if (held) {
      held.end();
      setMoving(false);
    } else if (dragging && !calm && performance.now() - velocity.time < 80) {
      // Lancé : le dessin continue sur son élan. Doigt resté immobile avant de se lever : il s'arrête net.
      coasting = requestAnimationFrame(coast);
    } else {
      setMoving(false);
    }
    press = null;
    held = null;
    dragging = false;
    void event;
  }

  // Hors exploration, la molette fait défiler la page ; ctrl + molette (ou le pincement) zoome.
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey && !wheelPans) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const bounds = root.getBoundingClientRect();
      zoomAt(
        view.scale * Math.exp(-event.deltaY / 200),
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        false,
      );
      return;
    }
    view.x -= event.deltaX;
    view.y -= event.deltaY;
    moved = true;
    keepInside();
    apply(false);
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", () => {
    held?.end();
    press = null;
    held = null;
    dragging = false;
    setMoving(false);
  });
  root.addEventListener("wheel", onWheel, { passive: false });

  const resizeObserver = new ResizeObserver(() => {
    if (!moved) fit(false);
  });
  resizeObserver.observe(container);
  fit(false);

  return {
    root,
    world,
    fit,
    frame,
    reveal,
    // Échelle de la vue d'ensemble, pour régler la taille des noms.
    fitted: () => fitted,
    setExploring(next: boolean) {
      wheelPans = next;
      exploring = next;
      insets.top = next ? 24 : 40;
    },
    zoom(factor: number) {
      zoomAt(view.scale / factor, container.clientWidth / 2, container.clientHeight / 2, true);
    },
    // Le dessin bouge sous le doigt (glissé, pincement, élan) : la scène peut s'épargner du travail.
    busy: () => "moving" in root.dataset,
    dispose() {
      window.clearTimeout(settle);
      cancelAnimationFrame(coasting);
      pinch.dispose();
      resizeObserver.disconnect();
      root.remove();
    },
  };
}
