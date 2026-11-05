"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export function NavLink({ href, icon, children }: { href: string; icon?: IconName; children: React.ReactNode }) {
  const pathname = usePathname();
  // /admin a ses propres sous-pages dans le menu : seule l'adresse exacte l'active.
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="nav-link">
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}
