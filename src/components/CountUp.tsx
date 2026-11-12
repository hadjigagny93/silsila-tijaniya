"use client";

import { useEffect, useRef } from "react";

const format = (value: number) => `+${value.toLocaleString("fr-FR")}`;

// Chiffre qui monte vite de 1 à sa valeur quand il apparaît à l'écran. Rendu côté serveur à sa valeur finale :
// sans JavaScript, ou avec les animations réduites, il ne bouge pas.
export function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    node.textContent = format(1);

    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = format(Math.max(1, Math.round(eased * value)));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = format(value);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="count-up">
      {format(value)}
    </span>
  );
}
