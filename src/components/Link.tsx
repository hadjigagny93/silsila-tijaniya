import NextLink from "next/link";
import type { ComponentProps } from "react";

// Les liens du site sans préchargement : Next calculait sinon, à chaque visite, chaque page dont le lien
// apparaît à l'écran (menu, listes de centaines de personnes), et Vercel compte ce calcul. Un clic charge la page.
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
