"use client";

import { useCallback, useRef } from "react";

const SIZE_KEY = "silsila:taille-carte";
const SMALLEST = 0.55;
const LARGEST = 1.15;

function savedScale() {
  try {
    const value = Number(localStorage.getItem(SIZE_KEY));
    return value >= SMALLEST && value <= LARGEST ? value : 1;
  } catch {
    return 1;
  }
}

// Une carte flottante qu'on attrape et qu'on pose où l'on veut, sans sortir de son cadre, et qu'on rétrécit
// (ou agrandit) en tirant son coin bas gauche ; le coin haut droit reste en place.
// Elle garde sa place d'une personne à l'autre, et sa taille d'une visite à l'autre ; boutons et liens gardent leur clic.
export function useDragCard() {
  const shift = useRef({ x: 0, y: 0 });
  const scale = useRef<number | null>(null);

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

  const onResizeDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const handle = event.currentTarget;
    const card = handle.parentElement!;
    const right = card.getBoundingClientRect().right;
    const width = card.getBoundingClientRect().width / (scale.current ?? 1);
    handle.setPointerCapture(event.pointerId);
    card.dataset.resizing = "";
    const move = (next: PointerEvent) => {
      const value = Math.min(Math.max((right - next.clientX) / width, SMALLEST), LARGEST);
      scale.current = value;
      card.style.scale = String(value);
    };
    const end = () => {
      delete card.dataset.resizing;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      try {
        localStorage.setItem(SIZE_KEY, String(scale.current ?? 1));
      } catch {
        // Sans stockage, la taille ne dure que le temps de la page.
      }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }, []);

  // Une carte qui réapparaît (autre personne) revient là où on l'avait posée, à la taille choisie.
  const ref = useCallback((card: HTMLElement | null) => {
    if (!card) return;
    scale.current ??= savedScale();
    card.style.translate = `${shift.current.x}px ${shift.current.y}px`;
    card.style.scale = String(scale.current);
  }, []);

  return {
    card: { ref, onPointerDown, "data-no-swipe": "" },
    grip: { onPointerDown: onResizeDown },
  };
}
