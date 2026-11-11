"use client";

import { useOptimistic, useTransition } from "react";
import { setVerseCount } from "@/app/actions";
import type { StationVerse as Verse } from "@/lib/stationVerses";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// Le verset de la station, et un compteur pour s'exercer à le répéter dans la journée.
export function StationVerse({
  station,
  verse,
  day,
  count,
  total,
}: {
  station: string;
  verse: Verse;
  day: string;
  count: number;
  total: number;
}) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(count);
  const change = (next: number) =>
    startTransition(async () => {
      setShown(next);
      await setVerseCount(station, day, next);
    });

  return (
    <div className="station-verse">
      <p className="station-verse-arabic" lang="ar" dir="rtl">
        ﴿ {verse.arabic} ﴾
      </p>
      <p className="station-verse-meaning">{verse.meaning}</p>
      <p className="station-verse-ref">{verse.ref}</p>
      <div className="station-verse-counter">
        <button type="button" className="button" onClick={() => change(shown + 1)}>
          <Icon name="plus" />
          {t.echiquier.repeat}
        </button>
        <span className="station-verse-count" aria-live="polite">
          {t.echiquier.repeatedToday(shown)}
        </span>
        <span className="text-muted">{t.echiquier.repeatedTotal(total - count + shown)}</span>
        {shown > 0 && (
          <button type="button" className="button-quiet" onClick={() => change(0)}>
            {t.echiquier.resetCount}
          </button>
        )}
      </div>
    </div>
  );
}
