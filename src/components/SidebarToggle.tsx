"use client";

import { useEffect } from "react";
import { t } from "@/messages/fr";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Cache ou montre la barre latérale du Mac (aussi avec ⌘\). Le choix est gardé dans un cookie, comme le thème,
// pour que le serveur rende la page déjà dans le bon état.
function toggle() {
  const root = document.documentElement;
  const hidden = root.dataset.sidebar !== "hidden";
  if (hidden) root.dataset.sidebar = "hidden";
  else delete root.dataset.sidebar;
  document.cookie = `sidebar=${hidden ? "hidden" : "shown"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

// Tirer le bord du menu change sa largeur ; sous RAIL_BELOW, il se range en rail d'icônes, et il en ressort
// dès qu'on le tire à nouveau vers la droite. Double-clic : retour à la largeur d'origine.
const RAIL_BELOW = 140;
const MIN = 190;
const MAX = 380;

function resize(event: React.PointerEvent<HTMLDivElement>) {
  if (event.button !== 0) return;
  const handle = event.currentTarget;
  const root = document.documentElement;
  let saved = "";
  handle.setPointerCapture(event.pointerId);
  root.dataset.resizing = "";
  const move = (next: PointerEvent) => {
    if (next.clientX < RAIL_BELOW) {
      root.dataset.rail = "true";
      saved = "rail";
      return;
    }
    const width = Math.round(Math.min(Math.max(next.clientX, MIN), MAX));
    delete root.dataset.rail;
    root.style.setProperty("--sidebar-open", `${width}px`);
    saved = String(width);
  };
  const end = () => {
    delete root.dataset.resizing;
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    if (saved) document.cookie = `sidebar-width=${saved}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

function resetWidth() {
  const root = document.documentElement;
  delete root.dataset.rail;
  root.style.removeProperty("--sidebar-open");
  document.cookie = `sidebar-width=; path=/; max-age=0; samesite=lax`;
}

export function SidebarToggle() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        className="sidebar-resize"
        onPointerDown={resize}
        onDoubleClick={resetWidth}
        title={t.nav.resizeSidebar}
        aria-hidden
      />
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggle}
        aria-label={t.nav.toggleSidebar}
        title={t.nav.toggleSidebar}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m14.5 6-6 6 6 6" />
        </svg>
      </button>
    </>
  );
}
