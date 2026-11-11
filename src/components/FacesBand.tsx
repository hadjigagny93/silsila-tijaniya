import Image from "next/image";
import Link from "next/link";
import type { PublicPerson } from "@/lib/data/types";
import { personImageUrl } from "./Avatar";

// Deux rangées de portraits qui défilent en sens contraires, sans JavaScript : chaque rangée est rendue deux fois
// à la suite et glisse de la moitié de sa largeur, ce qui boucle sans à-coup. Le survol l'arrête et montre le nom.
function Row({ persons, reverse }: { persons: PublicPerson[]; reverse?: boolean }) {
  // Peu de portraits : la rangée est répétée pour couvrir les grands écrans.
  let items = persons;
  while (items.length > 0 && items.length < 14) items = [...items, ...persons];
  const copy = (hidden: boolean) => (
    <ul className="faces-track" aria-hidden={hidden || undefined}>
      {items.map((person, index) => (
        <li key={`${person.id}-${index}`}>
          <Link href={`/silsila?personne=${person.id}`} className="face" tabIndex={hidden ? -1 : undefined}>
            <Image src={personImageUrl(person)} alt="" width={160} height={200} loading="lazy" unoptimized />
            <span className="face-name">{person.displayName}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="faces-row"
      data-reverse={reverse || undefined}
      style={{ "--faces-duration": `${Math.max(items.length * 3.2, 40)}s` } as React.CSSProperties}
    >
      {copy(false)}
      {copy(true)}
    </div>
  );
}

export function FacesBand({ persons, label }: { persons: PublicPerson[]; label: string }) {
  const half = Math.ceil(persons.length / 2);
  return (
    <section className="faces" aria-label={label}>
      <Row persons={persons.slice(0, half)} />
      <Row persons={persons.slice(half)} reverse />
    </section>
  );
}
