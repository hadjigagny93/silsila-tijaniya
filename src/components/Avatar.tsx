import Image from "next/image";
import type { PublicPerson } from "@/lib/data/types";
import { initialsOf } from "@/lib/names";
import { FALLBACK_IMAGE } from "./sceneTypes";

export function personImageUrl(person: PublicPerson) {
  return `/api/personnes/${person.id}/image${person.imageVersion ? `?v=${encodeURIComponent(person.imageVersion)}` : ""}`;
}

// Image du lieu qui caractérise la personne (sa zawiya, une ville où elle a vécu…).
export function placeImageUrl(person: PublicPerson) {
  return `/api/personnes/${person.id}/lieu${person.placeImageVersion ? `?v=${encodeURIComponent(person.placeImageVersion)}` : ""}`;
}

// Sans image, les initiales gardent la même forme : les listes restent alignées.
export function Avatar({ person, size = 28 }: { person: PublicPerson; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };

  // Sans photo : la calligraphie « رضي الله عنه » ; seul le Prophète ﷺ garde ses initiales s'il n'a pas d'image.
  if (!person.hasImage) {
    if (person.kind === "prophet") {
      return (
        <span className="avatar" style={style} aria-hidden>
          {initialsOf(person.displayName)}
        </span>
      );
    }
    return (
      <Image
        className="avatar avatar-radiya"
        style={style}
        src={FALLBACK_IMAGE}
        alt=""
        width={size}
        height={size}
        unoptimized
      />
    );
  }

  return (
    <Image
      className="avatar"
      style={style}
      src={personImageUrl(person)}
      alt=""
      width={size}
      height={size}
      unoptimized
    />
  );
}
