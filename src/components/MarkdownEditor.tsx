"use client";

import { useRef, useState } from "react";
import { t } from "@/messages/fr";
import { Icon, type IconName } from "./Icon";
import { MarkdownText } from "./MarkdownText";

type Action = {
  icon: IconName;
  title: string;
  run: (selection: string) => { text: string; start: number; end: number };
};

function wrap(mark: string, placeholder: string) {
  return (selection: string) => {
    // Les espaces restent dehors : Markdown ignore « ** mot** ».
    const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(selection) ?? [];
    const inner = core || placeholder;
    const start = (before?.length ?? 0) + mark.length;
    return { text: `${before}${mark}${inner}${mark}${after}`, start, end: start + inner.length };
  };
}

function prefix(mark: string, placeholder: string) {
  return (selection: string) => {
    const lines = (selection || placeholder).split("\n").map((line) => `${mark}${line}`);
    const text = lines.join("\n");
    return { text, start: selection ? 0 : mark.length, end: text.length };
  };
}

const ACTIONS: Action[] = [
  { icon: "bold", title: t.biographies.mdBold, run: wrap("**", t.biographies.mdSample) },
  { icon: "italic", title: t.biographies.mdItalic, run: wrap("*", t.biographies.mdSample) },
  { icon: "heading", title: t.biographies.mdHeading, run: prefix("## ", t.biographies.mdSample) },
  { icon: "list", title: t.biographies.mdList, run: prefix("- ", t.biographies.mdSample) },
  { icon: "quote", title: t.biographies.mdQuote, run: prefix("> ", t.biographies.mdSample) },
  {
    icon: "link",
    title: t.biographies.mdLink,
    run: (selection) => {
      const label = selection || t.biographies.mdSample;
      const start = label.length + 3;
      return { text: `[${label}](https://)`, start, end: start + 8 };
    },
  },
];

export function MarkdownEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);

  function apply(action: Action) {
    const element = area.current;
    if (!element) return;
    const { selectionStart: from, selectionEnd: to } = element;
    const { text, start, end } = action.run(value.slice(from, to));
    setValue(value.slice(0, from) + text + value.slice(to));
    // Le texte vient de changer : la sélection se replace après le rendu.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(from + start, from + end);
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!event.metaKey && !event.ctrlKey) return;
    const key = event.key.toLowerCase();
    if (key !== "b" && key !== "i") return;
    event.preventDefault();
    apply(ACTIONS[key === "b" ? 0 : 1]);
  }

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <div className="md-tabs" role="group" aria-label={t.biographies.mdMode}>
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
            {t.biographies.mdWrite}
          </button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
            {t.biographies.mdPreview}
          </button>
        </div>
        {!preview && (
          <div className="flex flex-wrap gap-0.5">
            {ACTIONS.map((action) => (
              <button
                key={action.title}
                type="button"
                title={action.title}
                aria-label={action.title}
                className="md-tool"
                onClick={() => apply(action)}
              >
                <Icon name={action.icon} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Le champ reste dans la page en aperçu : son contenu part avec le formulaire. */}
      <textarea
        ref={area}
        name={name}
        rows={20}
        maxLength={200000}
        value={value}
        hidden={preview}
        aria-label={t.biographies.formBody}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className="md-area"
      />
      {preview && (
        <div className="md-preview">
          {value.trim() ? <MarkdownText>{value}</MarkdownText> : <p className="text-muted">{t.biographies.mdEmpty}</p>}
        </div>
      )}
    </div>
  );
}
