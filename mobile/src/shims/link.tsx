import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate } from "../navigation";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname: string };
  children?: ReactNode;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
};

// Remplace next/link : un vrai lien, mais la navigation reste dans l'app.
export default function Link({ href, replace, scroll, prefetch, onClick, ...rest }: LinkProps) {
  void scroll;
  void prefetch;
  const target = typeof href === "string" ? href : href.pathname;
  return (
    <a
      {...rest}
      href={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || rest.target === "_blank") return;
        if (/^(https?:|mailto:|tel:)/.test(target)) return;
        event.preventDefault();
        navigate(target, { replace });
      }}
    />
  );
}
