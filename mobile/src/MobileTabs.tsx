import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNow } from "@/components/useNow";
import { PRAYERS, type SulukSettings } from "@/lib/data/types";
import { dayIn, formatHijri, minuteIn, prayerTimes } from "@/lib/suluk";
import { t } from "@/messages/fr";
import { mobileStore } from "./data";
import { navigate, useLocation } from "./navigation";
import { SyncBadge } from "./Pairing";

// L'en-tête de l'app iPhone, à la place de la barre latérale du Mac : la prochaine prière et son compte à rebours,
// la date hégirienne et grégorienne, puis les sections en onglets. Un glissement du doigt vers la gauche ou la droite
// passe à la section voisine.
const TABS = [
  { href: "/biographies", label: t.nav.biographies, matches: ["/biographies"] },
  { href: "/silsila", label: t.nav.silsila, matches: ["/silsila", "/admin/silsila"] },
  { href: "/admin/mouqaddams", label: t.nav.adminMouqaddams, matches: ["/admin/mouqaddams"] },
  { href: "/suluk", label: t.nav.suluk, matches: ["/suluk", "/echiquier"] },
];

const SWIPE = 70;

function tabOf(pathname: string) {
  return TABS.findIndex((tab) => tab.matches.some((base) => pathname === base || pathname.startsWith(`${base}/`)));
}

// Le glissement change d'onglet, sauf là où le doigt sert déjà : l'arbre, un champ, une liste qui défile de côté.
function ignored(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        ".svg-stage, .tree-stage, .pyramid-frame, canvas, input, textarea, select, .litany-sheet, .view-bar, .mobile-tabs-list, [data-no-swipe]",
      ),
    )
  );
}

function useNextPrayer() {
  const [settings, setSettings] = useState<SulukSettings | null>(null);
  const now = useNow();
  useEffect(() => {
    void mobileStore.getSulukSettings("local").then(setSettings);
  }, []);
  if (!settings || !now) return null;
  const today = dayIn(now, settings.timezone);
  const minute = minuteIn(now, settings.timezone);
  const clock = prayerTimes(today, settings);
  const next = PRAYERS.filter((prayer) => prayer !== "sunrise")
    .map((prayer) => ({ prayer, at: clock[prayer] }))
    .find((item) => item.at > minute) ?? { prayer: "fajr" as const, at: clock.fajr + 1440 };
  const left = next.at - minute;
  return {
    name: t.suluk.prayers[next.prayer],
    left: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`,
    hijri: formatHijri(today),
    day: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(now),
  };
}

export function MobileTabs() {
  const { location } = useLocation();
  const active = tabOf(location.pathname);
  const prayer = useNextPrayer();

  // Le glissement d'une section à l'autre : la page arrive du côté du geste, puis l'effet s'efface.
  useEffect(() => {
    const timer = setTimeout(() => delete document.body.dataset.slide, 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Comme dans une app à onglets, on arrive sur le premier : l'accueil du site n'est pas une section.
  useEffect(() => {
    if (window.location.pathname === "/") navigate(TABS[0].href, { replace: true });
  }, []);

  useEffect(() => {
    let start: { x: number; y: number; at: number } | null = null;
    const down = (event: TouchEvent) => {
      start =
        event.touches.length === 1 && !ignored(event.target)
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY, at: Date.now() }
          : null;
    };
    const up = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const quick = Date.now() - start.at < 600;
      start = null;
      // Un geste net et surtout horizontal : la page ne défilait pas.
      if (!quick || Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      const current = tabOf(window.location.pathname);
      const next = current === -1 ? 0 : current + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= TABS.length) return;
      document.body.dataset.slide = dx < 0 ? "left" : "right";
      navigate(TABS[next].href);
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchend", up, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchend", up);
    };
  }, []);

  return (
    <header className="mobile-tabs">
      <div className="mobile-tabs-top">
        <p className="mobile-tabs-prayer">
          {prayer ? (
            <>
              {t.suluk.prayerIn(prayer.name)} <strong>{prayer.left}</strong>
            </>
          ) : (
            <strong>{t.site.short}</strong>
          )}
        </p>
        <SyncBadge compact />
        <button
          type="button"
          className={`mobile-tabs-icon${location.pathname.startsWith("/mon-compte") ? " is-active" : ""}`}
          onClick={() => navigate("/mon-compte")}
          aria-label={t.nav.account}
        >
          <Icon name="user" />
        </button>
        <ThemeToggle initialDark={false} />
      </div>
      {prayer && (
        <p className="mobile-tabs-date">
          <span>{prayer.hijri}</span>
          <span aria-hidden className="mobile-tabs-bar" />
          <span>{prayer.day}</span>
        </p>
      )}
      <div className="mobile-tabs-dots" aria-hidden>
        {TABS.map((tab, index) => (
          <span key={tab.href} className={index === active ? "is-active" : undefined} />
        ))}
      </div>
      <nav className="mobile-tabs-list" aria-label={t.nav.admin}>
        {TABS.map((tab, index) => (
          <button
            key={tab.href}
            type="button"
            className="mobile-tab"
            aria-current={index === active ? "page" : undefined}
            onClick={() => {
              if (active !== -1 && index !== active) document.body.dataset.slide = index > active ? "left" : "right";
              navigate(tab.href);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
