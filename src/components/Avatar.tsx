import Image from "next/image";
import type { PublicPerson } from "@/lib/data/types";
import { initialsOf } from "@/lib/names";

export function personImageUrl(person: PublicPerson) {
  return `/api/personnes/${person.id}/image${person.imageVersion ? `?v=${encodeURIComponent(person.imageVersion)}` : ""}`;
}

// Sans image, les initiales gardent la même forme : les listes restent alignées.
export function Avatar({ person, size = 28 }: { person: PublicPerson; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (!person.hasImage) {
    return (
      <span className="avatar" style={style} aria-hidden>
        {initialsOf(person.displayName)}
      </span>
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
