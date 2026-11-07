"use client";

import { useCallback, useRef } from "react";

// Une carte flottante qu'on attrape et qu'on pose où l'on veut, sans sortir de son cadre.
// Elle reste à sa place d'une personne à l'autre ; boutons et liens gardent leur clic.
export function useDragCard() {
  const shift = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("a, button, input, select, textarea")) return;
    const card = event.currentTarget;
    const frame = (card.offsetParent ?? document.body).getBoundingClientRect();
    const box = card.getBoundingClientRect();
    // Où serait la carte sans déplacement : les bornes se calculent à partir de là.
    const left = box.left - shift.current.x;
    const top = box.top - shift.current.y;
    const grip = { x: event.clientX - shift.current.x, y: event.clientY - shift.current.y };
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

    card.setPointerCapture(event.pointerId);
    card.dataset.dragging = "";
    const move = (next: PointerEvent) => {
      const x = clamp(next.clientX - grip.x, frame.left - left, frame.right - left - box.width);
      const y = clamp(next.clientY - grip.y, frame.top - top, frame.bottom - top - box.height);
      shift.current = { x, y };
      card.style.translate = `${x}px ${y}px`;
    };
    const end = () => {
      delete card.dataset.dragging;
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", end);
      card.removeEventListener("pointercancel", end);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }, []);

  // Une carte qui réapparaît (autre personne) revient là où on l'avait posée.
  const ref = useCallback((card: HTMLElement | null) => {
    if (card) card.style.translate = `${shift.current.x}px ${shift.current.y}px`;
  }, []);

  return { ref, onPointerDown, "data-no-swipe": "" };
}
