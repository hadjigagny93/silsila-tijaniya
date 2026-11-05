"use client";

import { formatMinute, minuteIn } from "@/lib/suluk";
import { useNow } from "./useNow";

// L'heure du lieu, affichée une seule fois en haut de Suluk pour tous les cadrans.
export function SulukClock({ timezone }: { timezone: string }) {
  const now = useNow();
  return (
    <time className="suluk-clock" suppressHydrationWarning>
      {now ? formatMinute(minuteIn(now, timezone)) : "\u00a0"}
    </time>
  );
}
