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
  options: { maxScale?: number; onView?: (scale: number) => void } = {},
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

  function apply(glide: boolean) {
    world.classList.toggle("is-gliding", glide && !calm);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    root.dataset.far = String(view.scale < 0.55);
    options.onView?.(view.scale);
  }

  function frame(box: Box, glide: boolean, limit = 1.6) {
    const width = container.clientWidth - insets.left - insets.right;
    const height = container.clientHeight - insets.top - insets.bottom;
    view.scale = Math.min(width / box.width, height / box.height, limit);
    view.x = insets.left + (width - box.width * view.scale) / 2 - box.x * view.scale;
    view.y = insets.top + (height - box.height * view.scale) / 2 - box.y * view.scale;
    apply(glide);
  }

  function fit(glide: boolean) {
    frame(box(), glide);
    fitted = view.scale;
    moved = false;
  }

  function zoomAt(scale: number, x: number, y: number, glide: boolean) {
    const next = Math.min(Math.max(scale, fitted * 0.6), maxScale);
    view.x = x - ((x - view.x) / view.scale) * next;
    view.y = y - ((y - view.y) / view.scale) * next;
    view.scale = next;
    moved = true;
    apply(glide);
  }

  // Ramène un point dans la partie visible, sans changer le zoom s'il y est déjà.
  // Sur grand écran la carte de la personne est à droite ; sur téléphone, c'est un bandeau en bas.
  function reveal(x: number, y: number) {
    const narrow = container.clientWidth < 768;
    const right = narrow ? 40 : 380;
    const bottom = narrow ? insets.bottom + 190 : insets.bottom + 20;
    const screenX = view.x + x * view.scale;
    const screenY = view.y + y * view.scale;
    const inside =
      screenX > insets.left + 40 &&
      screenX < container.clientWidth - right &&
      screenY > insets.top + 40 &&
      screenY < container.clientHeight - bottom;
    if (inside) return;
    view.x = (narrow ? container.clientWidth / 2 : (container.clientWidth - 360) / 2) - x * view.scale;
    view.y =
      (narrow ? (container.clientHeight - bottom + insets.top) / 2 : (container.clientHeight - insets.bottom) / 2) -
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

  let press: { x: number; y: number; viewX: number; viewY: number; id: string | null } | null = null;
  let dragging = false;
  let held: Grab | null = null;
  let velocity = { x: 0, y: 0, time: 0 };
  let coasting = 0;

  function coast() {
    velocity.x *= FRICTION;
    velocity.y *= FRICTION;
    if (Math.hypot(velocity.x, velocity.y) < 0.3) return;
    view.x += velocity.x;
    view.y += velocity.y;
    apply(false);
    coasting = requestAnimationFrame(coast);
  }

  // Deux doigts : zoom par pincement ; le glissé et le toucher s'effacent.
  const pinch = attachPinch(
    root,
    view,
    (scale) => Math.min(Math.max(scale, fitted * 0.6), maxScale),
    () => {
      moved = true;
      press = null;
      held?.end();
      held = null;
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
    press = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, id: target?.dataset.id ?? null };
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
      // Saisir une personne la déplace ; saisir le fond déplace tout le dessin.
      if (press.id && grab) {
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
    const elapsed = Math.max(now - velocity.time, 1);
    velocity = { x: ((nextX - view.x) / elapsed) * 16, y: ((nextY - view.y) / elapsed) * 16, time: now };
    view.x = nextX;
    view.y = nextY;
    moved = true;
    apply(false);
  }

  function onUp(event: PointerEvent) {
    if (press && !dragging) {
      onTap(press.id);
    } else if (held) {
      held.end();
    } else if (dragging && !calm) {
      coasting = requestAnimationFrame(coast);
    }
    press = null;
    held = null;
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
    apply(false);
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", () => {
    held?.end();
    press = null;
    held = null;
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
      insets.top = next ? 24 : 40;
    },
    zoom(factor: number) {
      zoomAt(view.scale / factor, container.clientWidth / 2, container.clientHeight / 2, true);
    },
    dispose() {
      cancelAnimationFrame(coasting);
      pinch.dispose();
      resizeObserver.disconnect();
      root.remove();
    },
  };
}
