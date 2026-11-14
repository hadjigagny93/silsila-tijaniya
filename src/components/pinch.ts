// Zoom à deux doigts (écran tactile, iPhone) pour les vues qui gèrent elles-mêmes le glissé.
// Pendant un pincement, le dessin grossit autour du point entre les deux doigts et suit leur déplacement ;
// la vue ne doit alors ni glisser ni traiter un toucher (active() le lui dit).
type View = { x: number; y: number; scale: number };

export function attachPinch(
  element: HTMLElement | SVGElement,
  view: View,
  clamp: (scale: number) => number,
  apply: () => void,
) {
  const fingers = new Map<number, { x: number; y: number }>();
  let start: { distance: number; midX: number; midY: number; view: View } | null = null;

  const local = (event: PointerEvent) => {
    const bounds = element.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const measure = () => {
    const [a, b] = [...fingers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  };

  const down = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType !== "touch") return;
    // Premier doigt d'un nouveau geste : on oublie un doigt dont la levée se serait perdue (sinon le zoom
    // croirait à un pincement permanent et bloquerait le glissé).
    if (pointer.isPrimary) {
      fingers.clear();
      start = null;
    }
    fingers.set(pointer.pointerId, local(pointer));
    if (fingers.size === 2) start = { ...measure(), view: { ...view } };
  };
  const move = (event: Event) => {
    const pointer = event as PointerEvent;
    if (!fingers.has(pointer.pointerId)) return;
    fingers.set(pointer.pointerId, local(pointer));
    if (!start || fingers.size < 2) return;
    event.stopImmediatePropagation();
    const now = measure();
    const scale = clamp(start.view.scale * (now.distance / start.distance));
    // Le point du dessin sous le milieu des doigts au départ reste sous le milieu des doigts.
    const worldX = (start.midX - start.view.x) / start.view.scale;
    const worldY = (start.midY - start.view.y) / start.view.scale;
    view.scale = scale;
    view.x = now.midX - worldX * scale;
    view.y = now.midY - worldY * scale;
    apply();
  };
  const up = (event: Event) => {
    const pointer = event as PointerEvent;
    fingers.delete(pointer.pointerId);
    if (fingers.size < 2) start = null;
  };

  element.addEventListener("pointerdown", down, { capture: true });
  element.addEventListener("pointermove", move, { capture: true });
  element.addEventListener("pointerup", up, { capture: true });
  element.addEventListener("pointercancel", up, { capture: true });

  return {
    // Deux doigts posés : la vue laisse faire le zoom.
    active: () => fingers.size >= 2,
    dispose() {
      element.removeEventListener("pointerdown", down, { capture: true });
      element.removeEventListener("pointermove", move, { capture: true });
      element.removeEventListener("pointerup", up, { capture: true });
      element.removeEventListener("pointercancel", up, { capture: true });
    },
  };
}
