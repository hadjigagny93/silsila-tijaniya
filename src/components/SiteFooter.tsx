import Link from "@/components/Link";
import { X_HANDLE, X_URL } from "@/lib/social";
import { t } from "@/messages/fr";
import { Star } from "./Icon";

// Pied de page : le projet, les rubriques et les réseaux sociaux (X pour l'instant).
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <span className="site-name">
          <Star />
          <span>
            <strong>{t.site.short}</strong>
            <small>{t.site.tagline}</small>
          </span>
        </span>
        <p>{t.footer.about}</p>
      </div>
      <nav className="site-footer-links" aria-label={t.footer.links}>
        <Link href="/silsila">{t.nav.silsila}</Link>
        <Link href="/mouqaddams">{t.nav.mouqaddams}</Link>
        <Link href="/contribuer">{t.nav.contribute}</Link>
      </nav>
      <div className="site-footer-social">
        <span className="label">{t.footer.follow}</span>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="site-footer-x">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"
              fill="currentColor"
            />
          </svg>
          @{X_HANDLE}
        </a>
      </div>
    </footer>
  );
}
