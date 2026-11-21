import type { Metadata } from "next";
import { t } from "@/messages/fr";

// Adresse publique du site : les liens partagés (même depuis le Mac ou l'iPhone) mènent toujours ici.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://silsila-tijaniya.vercel.app").replace(/\/$/, "");
export const X_HANDLE = "silsilatijani";
export const X_URL = `https://x.com/${X_HANDLE}`;

// Image par défaut des aperçus (WhatsApp, X, Facebook) : la ruelle bleue, en version légère (WhatsApp ignore
// les images trop lourdes, au-delà de 300 Ko environ).
export const DEFAULT_SHARE_IMAGE = { url: "/apercu.jpg", width: 1200, height: 675, alt: t.site.name };

export function siteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// L'aperçu d'une page partagée : titre, texte et grande image. Next ne fusionne pas openGraph avec celui
// du parent, d'où ce bloc complet à chaque page.
export function shareMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
}): Metadata {
  const images = [image ? image : DEFAULT_SHARE_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: t.site.name,
      locale: "fr_FR",
      type: "article",
      images,
    },
    twitter: { card: "summary_large_image", site: `@${X_HANDLE}`, title, description, images },
  };
}
