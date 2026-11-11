import { cloneElement, createElement, isValidElement, useEffect, useState, type ComponentType, type ReactNode } from "react";
import RootLayout from "@/app/layout";
import { navigate, NotFoundSignal, RedirectSignal, useLocation } from "./navigation";

// Les pages de src/app, rendues dans l'app comme le fait le serveur Next : une page (ou un composant)
// déclarée async est attendue ici, puis le reste de l'arbre est confié à React.
type Page = ComponentType<{ params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> }>;

const modules = import.meta.glob<{ default: Page }>([
  "../../src/app/**/page.tsx",
  // Réservé au Mac : l'appairage s'y fait, et la connexion n'a pas d'objet sur un seul appareil.
  "!../../src/app/appairage/**",
  "!../../src/app/connexion/**",
  "!../../src/app/auth/**",
]);

type Route = { pattern: RegExp; keys: string[]; load: () => Promise<{ default: Page }>; weight: number };

const routes: Route[] = Object.entries(modules)
  .map(([file, load]) => {
    const path = file.replace("../../src/app", "").replace(/\/page\.tsx$/, "") || "/";
    const keys: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/\[([^\]]+)\]/g, (_, key: string) => {
        keys.push(key);
        return "([^/]+)";
      })}/?$`,
    );
    // Les adresses fixes passent avant les adresses à paramètre (« nouvelle » avant « [slug] »).
    return { pattern, keys, load, weight: keys.length };
  })
  .sort((a, b) => a.weight - b.weight);

function match(pathname: string) {
  for (const route of routes) {
    const found = route.pattern.exec(pathname);
    if (found) return { route, params: Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(found[index + 1])])) };
  }
  return null;
}

const isAsync = (type: unknown) => typeof type === "function" && type.constructor.name === "AsyncFunction";

// Attend les composants async de l'arbre, où qu'ils soient (enfants ou props qui portent des éléments).
async function resolveTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveTree));
  if (!isValidElement(node)) return node;
  const element = node as React.ReactElement<Record<string, unknown>>;
  if (isAsync(element.type)) {
    const render = element.type as (props: Record<string, unknown>) => Promise<ReactNode>;
    return resolveTree(await render(element.props));
  }
  const changes: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(element.props ?? {})) {
    if (!isValidElement(value) && !Array.isArray(value)) continue;
    const resolved = await resolveTree(value as ReactNode);
    changes[key] = resolved;
    changed ||= !sameTree(value as ReactNode, resolved);
  }
  if (!changed) return element;
  // Les enfants écrits à la suite en JSX n'ont pas de clé : on les repasse un par un, comme JSX le fait.
  const { children, ...rest } = changes;
  return "children" in changes && Array.isArray(children)
    ? cloneElement(element, rest, ...(children as ReactNode[]))
    : cloneElement(element, changes);
}

function sameTree(before: ReactNode, after: ReactNode): boolean {
  if (before === after) return true;
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
  return before.every((item, index) => sameTree(item, after[index]));
}

async function renderPage(pathname: string, search: string): Promise<ReactNode> {
  const found = match(pathname);
  const searchParams = Object.fromEntries(new URLSearchParams(search));
  let page: ReactNode;
  if (!found) {
    page = <NotFound />;
  } else {
    const { default: Component } = await found.route.load();
    page = await resolveTree(
      createElement(Component, { params: Promise.resolve(found.params), searchParams: Promise.resolve(searchParams) }),
    );
  }
  return unwrapDocument(await resolveTree(createElement(RootLayout, { children: page })));
}

// La mise en page racine rend <html> et <body> : dans l'app, React vit dans un div. On reporte leurs
// attributs (thème, classes) sur le vrai document et on garde leur contenu.
function unwrapDocument(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  const element = node as React.ReactElement<{ children?: ReactNode; className?: string; "data-theme"?: string }>;
  if (element.type === "html") {
    const theme = element.props["data-theme"];
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    return unwrapDocument(element.props.children);
  }
  if (element.type === "body") {
    document.body.className = `${element.props.className ?? ""} mobile-app`;
    return element.props.children;
  }
  return node;
}

function NotFound() {
  return (
    <div className="max-w-3xl">
      <h1 className="page-title">Page introuvable</h1>
    </div>
  );
}

// L'écran courant : rechargé à chaque navigation et après chaque écriture (version).
export function Router() {
  const { location, version } = useLocation();
  const [content, setContent] = useState<ReactNode>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    renderPage(location.pathname, location.search)
      .then((tree) => {
        if (cancelled) return;
        setFailure(null);
        setContent(tree);
        if (location.hash) {
          requestAnimationFrame(() =>
            document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(),
          );
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof RedirectSignal) return navigate(error.url, { replace: true });
        if (error instanceof NotFoundSignal) return setContent(<NotFound />);
        console.error(error);
        setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash, version]);

  if (failure) {
    return (
      <div className="mobile-failure">
        <p>Cette page n'a pas pu s'afficher.</p>
        <p className="text-sm text-muted">{failure}</p>
      </div>
    );
  }
  return content;
}
