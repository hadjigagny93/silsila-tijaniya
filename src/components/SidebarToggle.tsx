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
  );
}
