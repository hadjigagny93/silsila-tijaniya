import { t } from "@/messages/fr";

// Les trois tiers de la période : chacun se remplit avec les jours pleins de Suluk et ouvre un degré.
export function DegreeThirds({ thirds, full, days }: { thirds: number[]; full: number; days: number }) {
  return (
    <div className="degree-thirds">
      <ol>
        {thirds.map((ratio, index) => (
          <li key={index} className={ratio >= 1 ? "is-done" : undefined}>
            <span className="degree-thirds-bar" aria-hidden>
              <span style={{ width: `${Math.round(ratio * 100)}%` }} />
            </span>
            <span className="degree-thirds-label">{t.echiquier.degrees[index + 2]}</span>
          </li>
        ))}
      </ol>
      <p className="degree-thirds-note">{t.echiquier.thirdsNote(full, days)}</p>
    </div>
  );
}
