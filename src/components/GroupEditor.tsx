"use client";

import { useState } from "react";
import { saveGroup } from "@/app/actions";
import { GROUP_COLORS, PRAYERS, type LitanyGroup, type LitanyItem } from "@/lib/data/types";
import { CATALOG, catalogItem } from "@/lib/litanyCatalog";
import { formatMinute, groupDuration, groupLabel, groupMinute, type PrayerClock } from "@/lib/suluk";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

const OTHER = "autre";

// Une séance : son moment, ses jours, et la liste ordonnée des litanies faites ensemble.
// Chaque litanie ajoutée demande son temps estimé ; la séance dure leur somme.
export function GroupEditor({
  group,
  groups,
  clock,
  color,
}: {
  group?: LitanyGroup;
  // Toutes les séances : on peut enchaîner après n'importe laquelle, sauf celles qui suivent déjà celle-ci.
  groups: LitanyGroup[];
  clock: PrayerClock;
  color: string;
}) {
  // Le choix « quand » : une prière, « fixed », ou « after:<id> » pour enchaîner après une séance.
  const [when, setWhen] = useState(
    group?.anchor === "after" && group.follows ? `after:${group.follows}` : (group?.anchor ?? "fajr"),
  );
  const anchor = (when.startsWith("after:") ? "after" : when) as LitanyGroup["anchor"];
  const follows = anchor === "after" ? when.slice("after:".length) : null;
  const [offset, setOffset] = useState(group?.offset ?? 15);
  // Séances après lesquelles on peut enchaîner : pas celle-ci, ni celles qui en découlent.
  const descends = (candidate: LitanyGroup): boolean => {
    let current: LitanyGroup | undefined = candidate;
    const seen = new Set<string>();
    while (current && current.anchor === "after" && current.follows && !seen.has(current.id)) {
      if (current.follows === group?.id) return true;
      seen.add(current.id);
      current = groups.find((item) => item.id === current!.follows);
    }
    return false;
  };
  const chainable = groups.filter((item) => item.id !== group?.id && !descends(item));
  const [time, setTime] = useState(group?.time ?? "05:00");
  const [items, setItems] = useState<LitanyItem[]>(group?.items ?? []);
  const [choice, setChoice] = useState("");
  const [customName, setCustomName] = useState("");
  const [customArabic, setCustomArabic] = useState("");
  const [duration, setDuration] = useState("");
  // Nombre de fois, proposé par le catalogue (Salat al-Fatih ×500…) et modifiable avant l'ajout.
  const [count, setCount] = useState("");
  const total = groupDuration({ items });
  const start = groupMinute({ id: group?.id, anchor, offset, time, follows }, clock, groups);
  const days = new Set(group?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const taken = new Set(items.map((item) => item.name));

  const minutes = Math.round(Number(duration));
  const canAdd = Boolean(choice) && (choice !== OTHER || Boolean(customName.trim())) && minutes >= 1 && minutes <= 600;
  const pick = (key: string) => {
    setChoice(key);
    setDuration(key && key !== OTHER ? String(catalogItem(key)?.duration ?? "") : "");
    setCount(key && key !== OTHER ? String(catalogItem(key)?.count ?? "") : "");
  };
  const add = () => {
    if (!canAdd) return;
    const base =
      choice === OTHER
        ? { name: customName.trim(), arabic: customArabic.trim() || null, count: null, note: null }
        : catalogItem(choice)!;
    const times = Math.round(Number(count));
    setItems([...items, { ...base, count: times >= 1 && times <= 1000000 ? times : null, duration: minutes }]);
    pick("");
    setCustomName("");
    setCustomArabic("");
  };
  const move = (index: number, step: number) => {
    const next = [...items];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setItems(next);
  };
  const update = (index: number, change: Partial<LitanyItem>) =>
    setItems(items.map((item, position) => (position === index ? { ...item, ...change } : item)));

  return (
    <form action={saveGroup} className="litany-form">
      {group && <input type="hidden" name="id" value={group.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div>
        <span className="field-label">{t.suluk.groupItems}</span>
        {items.length === 0 && <p className="field-hint">{t.suluk.groupEmpty}</p>}
        <ol className="group-items">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="group-item">
              <span className="group-item-index">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="wird-name" title={item.name}>
                  {item.arabic ? (
                    <span className="litany-arabic" lang="ar">
                      {item.arabic}
                    </span>
                  ) : (
                    item.name
                  )}
                </span>
                {item.note && <span className="wird-when">{item.note}</span>}
              </span>
              <label className="group-item-duration">
                <input
                  type="number"
                  min={1}
                  max={600}
                  required
                  value={item.duration}
                  onChange={(event) => update(index, { duration: Number(event.target.value) })}
                  aria-label={t.suluk.durationOf(item.name)}
                  className="field"
                />
                <span>min</span>
              </label>
              <label className="group-item-duration">
                <span>×</span>
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={item.count ?? ""}
                  onChange={(event) => update(index, { count: event.target.value ? Number(event.target.value) : null })}
                  placeholder={t.suluk.timesPlaceholder}
                  aria-label={t.suluk.countOf(item.name)}
                  className="field group-item-count"
                />
              </label>
              <span className="group-item-tools">
                <button
                  type="button"
                  className="icon-quiet"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={t.suluk.moveUp(item.name)}
                >
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  className="icon-quiet is-down"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label={t.suluk.moveDown(item.name)}
                >
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  className="icon-quiet is-danger"
                  onClick={() => setItems(items.filter((_, position) => position !== index))}
                  aria-label={t.suluk.removeItem(item.name)}
                >
                  <Icon name="close" />
                </button>
              </span>
            </li>
          ))}
        </ol>

        <div className="group-add">
          <select
            value={choice}
            onChange={(event) => pick(event.target.value)}
            className="field"
            aria-label={t.suluk.addItem}
          >
            <option value="">{t.suluk.chooseItem}</option>
            {CATALOG.map((category) => (
              <optgroup key={category.category} label={category.category}>
                {category.items.map((item) => (
                  <option key={item.key} value={item.key} disabled={taken.has(item.name)}>
                    {item.arabic ?? item.name}
                    {item.count ? ` · ${t.suluk.times(item.count)}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER}>{t.suluk.otherItem}</option>
          </select>
          {choice === OTHER && (
            <>
              <input
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                maxLength={120}
                placeholder={t.suluk.namePlaceholder}
                aria-label={t.suluk.name}
                className="field"
              />
              <input
                value={customArabic}
                onChange={(event) => setCustomArabic(event.target.value)}
                maxLength={120}
                dir="rtl"
                lang="ar"
                placeholder="بالعربية"
                aria-label={t.suluk.arabic}
                className="field field-arabic"
              />
            </>
          )}
          {choice && (
            <label className="group-item-duration">
              <span>×</span>
              <input
                type="number"
                min={1}
                max={1000000}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                placeholder={t.suluk.timesPlaceholder}
                aria-label={t.suluk.countAsk}
                className="field group-item-count"
              />
            </label>
          )}
          {choice && (
            <label className="group-item-duration">
              <input
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder={t.suluk.durationPlaceholder}
                aria-label={t.suluk.durationAsk}
                className="field"
              />
              <span>min</span>
            </label>
          )}
          <button type="button" className="button-quiet" onClick={add} disabled={!canAdd}>
            <Icon name="plus" />
            {t.suluk.addItem}
          </button>
        </div>
        {choice && <p className="field-hint">{t.suluk.durationAsk}</p>}
        {items.length > 0 && (
          <p className="group-total">
            {t.suluk.total(total)} · {t.suluk.span(formatMinute(start), formatMinute((start + total) % 1440))}
          </p>
        )}
      </div>

      <div className="litany-form-row">
        <label className="block flex-1">
          <span className="field-label">{t.suluk.when}</span>
          <select
            name="anchor"
            value={when}
            onChange={(event) => {
              const next = event.target.value;
              // En passant à l'enchaînement, on part sans pause.
              if (next.startsWith("after:") && !when.startsWith("after:")) setOffset(0);
              setWhen(next);
            }}
            className="field"
          >
            {PRAYERS.map((prayer) => (
              <option key={prayer} value={prayer}>
                {t.suluk.after(t.suluk.prayers[prayer])}
              </option>
            ))}
            <option value="fixed">{t.suluk.fixed}</option>
            {chainable.length > 0 && (
              <optgroup label={t.suluk.chainGroup}>
                {chainable.map((item) => (
                  <option key={item.id} value={`after:${item.id}`}>
                    {t.suluk.chainAfter(groupLabel(item))} ·{" "}
                    {formatMinute((groupMinute(item, clock, groups) + groupDuration(item)) % 1440)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {anchor === "after" ? (
          <label className="block flex-1">
            <span className="field-label">{t.suluk.pause}</span>
            <input
              type="number"
              name="offset"
              min={0}
              max={240}
              step={1}
              value={offset}
              onChange={(event) => setOffset(Number(event.target.value))}
              className="field"
            />
            <span className="field-hint">{t.suluk.pauseHint}</span>
          </label>
        ) : anchor === "fixed" ? (
          <label className="block flex-1">
            <span className="field-label">{t.suluk.time}</span>
            <input
              type="time"
              name="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="field"
            />
          </label>
        ) : (
          <label className="block flex-1">
            <span className="field-label">{t.suluk.offset}</span>
            <input
              type="number"
              name="offset"
              min={-720}
              max={720}
              step={5}
              value={offset}
              onChange={(event) => setOffset(Number(event.target.value))}
              className="field"
            />
            <span className="field-hint">{t.suluk.offsetHint}</span>
          </label>
        )}
        <label className="block flex-1">
          <span className="field-label">{t.suluk.groupName}</span>
          <input
            name="name"
            maxLength={120}
            defaultValue={group?.name ?? ""}
            placeholder={t.suluk.groupNamePlaceholder}
            className="field"
          />
        </label>
      </div>

      <fieldset>
        <legend className="field-label">{t.suluk.color}</legend>
        <div className="color-picker">
          {GROUP_COLORS.map((swatch) => (
            <label key={swatch} style={{ "--swatch": swatch } as React.CSSProperties}>
              <input type="radio" name="color" value={swatch} defaultChecked={swatch === (group?.color ?? color)} />
              <span aria-label={t.suluk.colorName(GROUP_COLORS.indexOf(swatch))} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">{t.suluk.daysLabel}</legend>
        <div className="day-picker">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <label key={day}>
              <input type="checkbox" name="days" value={day} defaultChecked={days.has(day)} />
              <span>{t.suluk.weekdayNames[day]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <button className="button" disabled={items.length === 0}>
          {group ? t.suluk.save : t.suluk.createGroup}
        </button>
      </div>
    </form>
  );
}
