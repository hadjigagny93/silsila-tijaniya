import type { PublicPerson } from "@/lib/data/types";
import { personImageUrl } from "./Avatar";

const SIZE = 168;
const GAP = 22;

// Loupe : à la souris, la photo survolée s'affiche en grand à côté du curseur, sans gêner le clic ni le
// glissement. Au doigt, rien ne change (le toucher choisit la personne).
export function attachLoupe(
  container: HTMLElement,
  root: SVGSVGElement,
  find: (personId: string) => PublicPerson | undefined,
) {
  const loupe = document.createElement("div");
  loupe.className = "tree-loupe";
  loupe.setAttribute("aria-hidden", "true");
  loupe.style.setProperty("--loupe-size", `${SIZE}px`);
  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  loupe.appendChild(image);
  container.appendChild(loupe);
  let shown: string | null = null;

  const hide = () => {
    shown = null;
    loupe.classList.remove("is-on");
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons) return hide();
    const target = (event.target as Element).closest<SVGElement>("[data-id]");
    const person = target?.dataset.id ? find(target.dataset.id) : undefined;
    if (!person?.hasImage || person.kind === "prophet") return hide();
    if (shown !== person.id) {
      shown = person.id;
      image.src = personImageUrl(person);
    }
    const box = container.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    // À droite du curseur et au-dessus ; de l'autre côté quand le bord est trop près.
    const left = x + GAP + SIZE > box.width ? x - GAP - SIZE : x + GAP;
    const top = Math.min(Math.max(y - SIZE - GAP / 2, 8), box.height - SIZE - 8);
    loupe.style.transform = `translate(${Math.max(left, 8)}px, ${top}px)`;
    loupe.classList.add("is-on");
  };

  root.addEventListener("pointermove", move);
  root.addEventListener("pointerover", move);
  root.addEventListener("pointerleave", hide);
  root.addEventListener("pointerdown", hide);
  root.addEventListener("wheel", hide, { passive: true });

  return () => {
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerover", move);
    root.removeEventListener("pointerleave", hide);
    root.removeEventListener("pointerdown", hide);
    root.removeEventListener("wheel", hide);
    loupe.remove();
  };
}
