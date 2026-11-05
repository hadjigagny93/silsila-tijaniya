import { setBiographyCover } from "@/app/actions";
import { coverUrl } from "@/lib/coverUrl";
import type { Biography } from "@/lib/data/types";
import { t } from "@/messages/fr";

// Un clic sur une image l'enregistre : pas besoin de passer par le formulaire complet.
export function CoverChanger({ biography, covers }: { biography: Biography; covers: string[] }) {
  return (
    <details className="cover-changer">
      <summary>{t.biographies.changeCover}</summary>
      <form action={setBiographyCover}>
        <input type="hidden" name="slug" value={biography.slug} />
        <button name="cover" value="" aria-pressed={!biography.cover}>
          <span className="cover-auto">{t.biographies.formCoverAuto}</span>
        </button>
        {covers.map((cover) => (
          <button
            key={cover}
            name="cover"
            value={cover}
            aria-pressed={biography.cover === cover}
            aria-label={`${t.biographies.changeCover} : ${cover}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl(cover)} alt="" />
          </button>
        ))}
      </form>
    </details>
  );
}
