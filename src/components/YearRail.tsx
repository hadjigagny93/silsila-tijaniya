"use client";

import { type PointerEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { yearOf } from "@/lib/dates";
import { t } from "@/messages/fr";

const TICK_SPACING = 30;
// Laisse la place au bouton de thème, en haut à droite.
const SCREEN_MARGIN = 56;
const MIN_HEIGHT = 120;

// Frise fixe à droite : suit la fiche sous la souris, et se fait glisser pour
// aller à une année. Son échelle est la liste elle-même, sinon un seul nom très
// ancien écraserait tous les autres vers le bas.
export function YearRail({
  years,
  list,
}: {
  years: (string | null)[];
  list: RefObject<HTMLElement | null>;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const refresh = useRef(() => {});
  const [current, setCurrent] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!rail.current) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(rail.current);
    return () => observer.disconnect();
  }, [years.length]);

  useEffect(() => {
    let frame = 0;

    // La frise part de la première fiche et reste à l'écran une fois la liste défilée.
    function align() {
      const cards = list.current?.children;
      if (!rail.current || !cards?.length) return;
      const first = cards[0].getBoundingClientRect();
      const end = cards[cards.length - 1].getBoundingClientRect();
      const start = first.top + first.height / 2;
      const room = window.innerHeight - (start + window.scrollY) - SCREEN_MARGIN;
      const span = end.top + end.height / 2 - start;
      rail.current.style.top = `${Math.max(start, SCREEN_MARGIN)}px`;
      rail.current.style.height = `${Math.min(span, Math.max(room, MIN_HEIGHT))}px`;
    }

    function update() {
      frame = 0;
      // Pendant un glissement, la frise ne bouge pas : elle reste sous la souris.
      if (dragging.current || !list.current) return;
      align();
      // Sans souris, le repère descend avec la page pour atteindre les deux bouts de la liste.
      const page = document.documentElement;
      const progress = window.scrollY / Math.max(page.scrollHeight - window.innerHeight, 1);
      const { x, y } = pointer.current ?? { x: 0, y: window.innerHeight * progress };

      let best = 0;
      let bestDistance = Infinity;
      Array.from(list.current.children).forEach((card, index) => {
        const box = card.getBoundingClientRect();
        const distance = Math.max(box.top - y, 0, y - box.bottom) * 1000 + Math.max(box.left - x, 0, x - box.right);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      setCurrent(best);
    }

    function schedule() {
      frame ||= requestAnimationFrame(update);
    }

    function onMove(event: globalThis.PointerEvent) {
      if (rail.current?.contains(event.target as Node)) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      schedule();
    }

    refresh.current = schedule;
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onMove);
    };
  }, [list, years]);

  const last = years.length - 1;
  const positionOf = (index: number) => (index / last) * height;

  const ticks = useMemo(() => {
    const kept: { index: number; label: string }[] = [];
    let lastTop = -TICK_SPACING;
    let lastLabel: string | null = null;
    years.forEach((value, index) => {
      const label = yearOf(value) ?? "?";
      const top = (index / last) * height;
      if (label === lastLabel || top - lastTop < TICK_SPACING) return;
      kept.push({ index, label });
      lastTop = top;
      lastLabel = label;
    });
    return kept;
  }, [years, height, last]);

  function jump(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
    const index = Math.round(fraction * last);
    setCurrent(index);
    list.current?.children[index]?.scrollIntoView({ block: "center" });
  }

  function release() {
    dragging.current = false;
    refresh.current();
  }

  if (years.length < 2) return null;

  const index = Math.min(current, last);

  return (
    <div
      ref={rail}
      className="year-rail"
      aria-hidden
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
        pointer.current = null;
        jump(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current) jump(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {ticks.map((tick) => (
        <span key={tick.index} className="year-rail-tick" style={{ top: positionOf(tick.index) }}>
          {tick.label}
        </span>
      ))}
      <span className="year-rail-marker" style={{ top: positionOf(index) }}>
        <span className="year-rail-year">{years[index] ?? t.admin.yearUnknown}</span>
      </span>
    </div>
  );
}
