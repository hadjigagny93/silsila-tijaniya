"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export function NavLink({
  href,
  icon,
  also,
  children,
}: {
  href: string;
  icon?: IconName;
  // Une autre page rattachée à cette entrée du menu (et ses sous-pages).
  also?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // /admin a ses propres sous-pages dans le menu : seule l'adresse exacte l'active.
  const matches = (base: string) => pathname === base || (base !== "/admin" && pathname.startsWith(`${base}/`));
  const active = matches(href) || (also !== undefined && matches(also));

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="nav-link">
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}
