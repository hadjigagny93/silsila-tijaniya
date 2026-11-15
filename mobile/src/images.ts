import { mobileStore } from "./data";

// Sur le Mac, les photos des personnes viennent de l'adresse /api/personnes/<id>/image.
// Dans l'app, elles sont dans la base du téléphone : toute image qui vise cette adresse (balise img,
// textures de la vue 3D) est servie depuis la base, sous forme d'URL blob. Pareil pour l'image du lieu (/lieu).
const PATTERN = /\/api\/personnes\/([^/?#]+)\/(image|lieu)\b/;
const cache = new Map<string, Promise<string | null>>();

function bytesOf(url: string) {
  const found = PATTERN.exec(url)!;
  const id = decodeURIComponent(found[1]);
  return found[2] === "lieu" ? mobileStore.getPlaceImage(id) : mobileStore.getPersonImage(id);
}

function blobUrl(url: string, version: string) {
  const found = PATTERN.exec(url)!;
  const key = `${found[2]}:${found[1]}?${version}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      bytesOf(url).then((bytes) =>
        bytes ? URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/jpeg" })) : null,
      ),
    );
  }
  return cache.get(key)!;
}

export function servePersonImages() {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return descriptor.get!.call(this);
    },
    set(value: string) {
      const found = typeof value === "string" ? PATTERN.exec(value) : null;
      if (!found) return descriptor.set!.call(this, value);
      const version = new URL(value, window.location.href).searchParams.get("v") ?? "";
      void blobUrl(value, version).then((url) => {
        if (url) descriptor.set!.call(this, url);
        else this.dispatchEvent(new Event("error"));
      });
    },
  });
  // React pose parfois src en attribut plutôt qu'en propriété ; les images SVG (vue en arbre) passent par href.
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    if (this instanceof HTMLImageElement && name === "src" && PATTERN.test(value)) {
      this.src = value;
      return;
    }
    if (this instanceof SVGImageElement && (name === "href" || name === "xlink:href") && PATTERN.test(value)) {
      const version = new URL(value, window.location.href).searchParams.get("v") ?? "";
      void blobUrl(value, version).then((url) => url && setAttribute.call(this, name, url));
      return;
    }
    setAttribute.call(this, name, value);
  };
  const setAttributeNS = Element.prototype.setAttributeNS;
  Element.prototype.setAttributeNS = function (namespace: string | null, name: string, value: string) {
    if (this instanceof SVGImageElement && /href$/.test(name) && PATTERN.test(value)) {
      this.setAttribute("href", value);
      return;
    }
    setAttributeNS.call(this, namespace, name, value);
  };

  // La vue 3D lit les photos avec fetch().
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!PATTERN.test(url)) return originalFetch(input, init);
    const bytes = await bytesOf(url);
    return bytes
      ? new Response(new Blob([bytes as BlobPart], { type: "image/jpeg" }), { headers: { "Content-Type": "image/jpeg" } })
      : new Response(null, { status: 404 });
  };
}
