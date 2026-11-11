"use client";

import { useState } from "react";
import { saveSulukSettings } from "@/app/actions";
import { PRAYER_METHODS, type SulukSettings } from "@/lib/data/types";
import { CITIES } from "@/lib/suluk";
import { t } from "@/messages/fr";

const OTHER = "";

export function SulukSettingsForm({ settings }: { settings: SulukSettings }) {
  const preset = CITIES.find((city) => city.name === settings.city);
  const [city, setCity] = useState(preset ? preset.name : OTHER);

  return (
    <form action={saveSulukSettings} className="litany-form">
      <div className="litany-form-row">
        <label className="block flex-1">
          <span className="field-label">{t.suluk.city}</span>
          <select name="city" value={city} onChange={(event) => setCity(event.target.value)} className="field">
            {CITIES.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
            <option value={OTHER}>{t.suluk.otherCity}</option>
          </select>
        </label>
        <label className="block flex-1">
          <span className="field-label">{t.suluk.method}</span>
          <select name="method" defaultValue={settings.method} className="field">
            {PRAYER_METHODS.map((method) => (
              <option key={method} value={method}>
                {t.suluk.methods[method]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {city === OTHER && (
        <div className="litany-form-row">
          <input type="hidden" name="timezone" value={preset ? Intl.DateTimeFormat().resolvedOptions().timeZone : settings.timezone} />
          <label className="block flex-[2]">
            <span className="field-label">{t.suluk.cityName}</span>
            <input name="cityName" required maxLength={120} defaultValue={preset ? "" : settings.city} className="field" />
          </label>
          <label className="block flex-1">
            <span className="field-label">{t.suluk.latitude}</span>
            <input name="latitude" required inputMode="decimal" defaultValue={preset ? "" : settings.latitude} className="field" />
          </label>
          <label className="block flex-1">
            <span className="field-label">{t.suluk.longitude}</span>
            <input name="longitude" required inputMode="decimal" defaultValue={preset ? "" : settings.longitude} className="field" />
          </label>
        </div>
      )}
      <p className="field-hint">{t.suluk.settingsIntro}</p>
      <div>
        <button className="button">{t.suluk.save}</button>
      </div>
    </form>
  );
}
