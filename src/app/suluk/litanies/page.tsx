import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteGroup } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { GroupEditor } from "@/components/GroupEditor";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { SulukSettingsForm } from "@/components/SulukSettingsForm";
import { getStore } from "@/lib/data";
import { GROUP_COLORS, type LitanyGroup } from "@/lib/data/types";
import { formatMinute, groupDuration, groupLabel, groupMinute, prayerTimes, todayKey } from "@/lib/suluk";
import { loadSuluk } from "@/lib/sulukData";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.suluk.manage };

function daysText(group: LitanyGroup) {
  if (group.days.length === 7) return t.suluk.everyDay;
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => group.days.includes(day))
    .map((day) => t.suluk.weekdayNames[day])
    .join(", ");
}

export default async function LitaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string; modifier?: string }>;
}) {
  const session = await getStore().getSession();
  if (!session) redirect("/connexion");
  const { ok, erreur, modifier } = await searchParams;
  const { settings, groups } = await loadSuluk(session.userId);
  const clock = prayerTimes(todayKey(settings.timezone), settings);
  // Ce qui suit « après » dans le libellé : la prière, ou la séance qu'on enchaîne.
  const moment = (group: (typeof groups)[number]) =>
    group.anchor === "fixed"
      ? ""
      : group.anchor === "after"
        ? groupLabel(groups.find((item) => item.id === group.follows) ?? group)
        : t.suluk.prayers[group.anchor];
  const ordered = [...groups].sort((a, b) => groupMinute(a, clock, groups) - groupMinute(b, clock, groups));
  // Une nouvelle séance prend la première couleur encore libre.
  const used = new Set(groups.map((group) => group.color));
  const freeColor = GROUP_COLORS.find((color) => !used.has(color)) ?? GROUP_COLORS[groups.length % GROUP_COLORS.length];

  return (
    <div className="max-w-4xl">
      <Link href="/suluk" className="back-link">
        <Icon name="arrowL" />
        {t.suluk.back}
      </Link>
      <h1 className="page-title mt-3">{t.suluk.manage}</h1>
      <p className="page-intro">{t.suluk.manageIntro}</p>
      {ok && <Notice tone="success">{t.suluk.saved}</Notice>}
      {erreur && <Notice tone="error">{t.errors.invalid}</Notice>}

      <ul className="litany-list">
        {ordered.length === 0 && <li className="text-muted">{t.suluk.noLitanies}</li>}
        {ordered.map((group) => {
          const editing = modifier === group.id;
          const start = groupMinute(group, clock, groups);
          const total = groupDuration(group);
          return (
            <li
              key={group.id}
              id={`seance-${group.id}`}
              className="panel group-panel scroll-mt-6"
              style={{ "--group-color": group.color } as React.CSSProperties}
            >
              <div className="group-card">
                <span className="group-time">
                  <span>{formatMinute(start)}</span>
                  <span className="group-time-end">{formatMinute((start + total) % 1440)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wird-name">{group.name ?? t.suluk.schedule(group, moment(group))}</p>
                  <p className="wird-when">
                    {group.name && `${t.suluk.schedule(group, moment(group))} · `}
                    {daysText(group)} · {t.suluk.total(total)}
                  </p>
                  <ol className="group-chips">
                    {group.items.map((item, index) => (
                      <li key={`${item.name}-${index}`} title={item.name}>
                        {/* Seulement le nom arabe ; le nom français reste en info-bulle, ou s'affiche faute d'arabe. */}
                        {item.arabic ? (
                          <span className="litany-arabic" lang="ar">
                            {item.arabic}
                          </span>
                        ) : (
                          item.name
                        )}
                        {item.count && <span className="wird-count">{t.suluk.times(item.count)}</span>}
                        <span className="group-chip-duration">{item.duration} min</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="group-actions">
                  <Link
                    href={editing ? "/suluk/litanies" : `/suluk/litanies?modifier=${group.id}#seance-${group.id}`}
                    className="button-quiet"
                    scroll={false}
                  >
                    <Icon name={editing ? "close" : "edit"} />
                    {editing ? t.suluk.cancel : t.suluk.edit}
                  </Link>
                  <form action={deleteGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <ConfirmButton message={t.suluk.deleteConfirm(groupLabel(group))} className="button-danger">
                      <Icon name="trash" />
                      {t.suluk.delete}
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              {editing && (
                <div className="mt-5 border-t border-line pt-5">
                  <GroupEditor group={group} groups={groups} clock={clock} color={group.color} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="panel mt-6">
        <h2>{t.suluk.newGroup}</h2>
        <div className="mt-4">
          <GroupEditor groups={groups} clock={clock} color={freeColor} />
        </div>
      </section>

      <section id="reglages" className="panel mt-6 scroll-mt-6">
        <h2>{t.suluk.settings}</h2>
        <div className="mt-4">
          <SulukSettingsForm settings={settings} />
        </div>
      </section>
    </div>
  );
}
