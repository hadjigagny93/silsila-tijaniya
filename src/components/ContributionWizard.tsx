"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { chainOf, isChoosableMouqaddam } from "@/lib/chain";
import type { ContributionKind } from "@/lib/contributions";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { PersonPicker } from "./PersonPicker";

const c = t.contribute;

// Une photo de téléphone pèse plusieurs Mo : on la réduit dans le navigateur avant l'envoi.
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 720 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  return (
    <div className="contrib-photo">
      <span className="contrib-photo-preview" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local, avant envoi */}
        {value ? <img src={`data:image/jpeg;base64,${value}`} alt="" /> : <Icon name="image" size={22} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="field-label">
          {label} <small>{c.optional}</small>
        </span>
        <span className="field-help block">{c.photoHelp}</span>
        {error && <span className="contrib-error">{c.tooBig}</span>}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError(false);
          try {
            const data = await shrink(file);
            if (data.length > 1_300_000) throw new Error("big");
            onChange(data);
          } catch {
            setError(true);
          }
        }}
      />
      <span className="flex flex-wrap gap-2">
        <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
          <Icon name="upload" size={16} />
          {value ? c.photoChange : c.photoAdd}
        </button>
        {value && (
          <button type="button" className="contrib-link" onClick={() => onChange(null)}>
            {c.photoRemove}
          </button>
        )}
      </span>
    </div>
  );
}

// La chaîne du futur mouqaddam : celle de son maître, et lui au bout.
function ChainPreview({ persons, masterId, masterName, name }: { persons: PublicPerson[]; masterId: string | null; masterName: string; name: string }) {
  const found = masterId ? chainOf(persons, masterId) : null;
  const chain = found?.chain ?? [];
  const head = chain.length > 5 ? chain.slice(0, 2) : chain;
  const tail = chain.length > 5 ? chain.slice(-2) : [];
  const hidden = chain.length - head.length - tail.length;
  const newcomer = name.trim() || c.name;

  return (
    <aside className="contrib-chain" aria-live="polite">
      <p className="contrib-chain-title">{c.chainTitle}</p>
      {!masterId && !masterName.trim() ? (
        <p className="contrib-chain-empty">{c.chainEmpty}</p>
      ) : (
        <ol>
          {head.map((person) => (
            <li key={person.id}>
              {person.kind === "prophet" ? <span className="contrib-chain-star" /> : <Avatar person={person} size={26} />}
              <span>{person.displayName}</span>
            </li>
          ))}
          {hidden > 0 && <li className="contrib-chain-more">{c.chainHidden(hidden)}</li>}
          {tail.map((person) => (
            <li key={person.id}>
              <Avatar person={person} size={26} />
              <span>{person.displayName}</span>
            </li>
          ))}
          {!masterId && (
            <li className="contrib-chain-outside">
              <span className="contrib-chain-dot" />
              <span>{masterName}</span>
            </li>
          )}
          <li className="contrib-chain-new">
            <span className="contrib-chain-dot" />
            <span>
              {newcomer} <em>{c.chainNew}</em>
            </span>
          </li>
        </ol>
      )}
      {found?.complete && <p className="contrib-chain-foot">{c.chainLinks(chain.length)}</p>}
      {!masterId && masterName.trim() && <p className="contrib-chain-foot">{c.chainOutside}</p>}
    </aside>
  );
}

function Chips({ options, value, onToggle, multiple }: { options: string[]; value: string[]; onToggle: (option: string) => void; multiple?: boolean }) {
  return (
    <div className="contrib-chips" role={multiple ? "group" : "radiogroup"}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role={multiple ? undefined : "radio"}
          aria-checked={multiple ? undefined : value.includes(option)}
          aria-pressed={multiple ? value.includes(option) : undefined}
          className="contrib-chip"
          onClick={() => onToggle(option)}
        >
          {value.includes(option) && <Icon name="check" size={14} />}
          {option}
        </button>
      ))}
    </div>
  );
}

export function ContributionWizard({
  kind,
  persons,
  details,
  initialPersonId,
}: {
  kind: ContributionKind;
  persons: PublicPerson[];
  details: Record<string, string>;
  initialPersonId?: string;
}) {
  const steps = c.steps[kind];
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  // Moment d'ouverture de l'assistant : un envoi trop rapide trahit un robot.
  const [openedAt] = useState(() => Date.now());
  const textArea = useRef<HTMLTextAreaElement>(null);

  // Ajouter un mouqaddam
  const [name, setName] = useState("");
  const [nicknames, setNicknames] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [deathPlace, setDeathPlace] = useState("");
  const [zawiya, setZawiya] = useState("");
  const [masterId, setMasterId] = useState<string | null>(null);
  const [masterName, setMasterName] = useState("");
  const [masterFree, setMasterFree] = useState(false);
  const [alsoFromId, setAlsoFromId] = useState<string | null>(null);
  // Compléter ou corriger
  const [personId, setPersonId] = useState<string | null>(
    initialPersonId && persons.some((person) => person.id === initialPersonId) ? initialPersonId : null,
  );
  const [text, setText] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  // Commun
  const [photo, setPhoto] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState("");
  const [source, setSource] = useState("");
  const [you, setYou] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");

  const masters = useMemo(
    () =>
      persons
        .filter((person) => person.kind === "prophet" || isChoosableMouqaddam(person))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr")),
    [persons],
  );
  const everyone = useMemo(
    () =>
      persons
        .filter((person) => person.kind !== "prophet")
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr")),
    [persons],
  );
  const person = persons.find((candidate) => candidate.id === personId) ?? null;

  function check(index: number) {
    const found: Record<string, string> = {};
    if (kind === "mouqaddam") {
      if (index === 0 && name.trim().length < 2) found.name = c.required;
      if (index === 1 && !masterId && masterName.trim().length < 2) found.master = c.pickMaster;
    } else {
      if (index === 0 && !personId) found.person = c.pickPerson;
      if (index === 1 && kind === "biography" && text.trim().length < 10) found.text = c.writeSomething;
      if (index === 1 && kind === "correction") {
        if (topics.length === 0) found.topics = c.pickTopic;
        if (text.trim().length < 3 && !photo) found.text = c.writeSomething;
      }
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function go(next: number) {
    if (next > step && !check(step)) return;
    setStep(next);
    setFailure(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function send() {
    for (let index = 0; index < steps.length; index++) {
      if (!check(index)) return setStep(index);
    }
    setStatus("sending");
    setFailure(null);
    const sources = { sourceKind, source };
    const payload =
      kind === "mouqaddam"
        ? { name, nicknames, birthDate, birthPlace, deathDate, deathPlace, zawiya, masterId, masterName: masterId ? "" : masterName, alsoFromId, notes: text, ...sources }
        : { text, topics, ...sources };
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, personId, payload, photo, name: you, contact, website, openedAt }),
      });
      if (response.status === 429) throw new Error(c.rateLimit);
      if (!response.ok) throw new Error(c.failed);
      setStatus("sent");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatus("idle");
      setFailure(error instanceof Error && error.message !== "Failed to fetch" ? error.message : c.failed);
    }
  }

  function insertSection(title: string) {
    const prefix = text && !text.endsWith("\n\n") ? (text.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = `${text}${prefix}## ${title}\n`;
    // Le texte est posé tout de suite, puis le curseur va à la fin : la frappe suivante s'écrit sous l'intertitre.
    flushSync(() => setText(next));
    textArea.current?.focus();
    textArea.current?.setSelectionRange(next.length, next.length);
  }

  if (status === "sent") {
    return (
      <section className="contrib-card contrib-thanks">
        <span className="contrib-thanks-mark" aria-hidden>
          <Icon name="check" size={28} />
        </span>
        <h2>{c.thanksTitle}</h2>
        <p className="text-muted">{c.thanksText}</p>
        {kind === "mouqaddam" && <ChainPreview persons={persons} masterId={masterId} masterName={masterName} name={name} />}
        <div className="contrib-actions justify-center">
          <Link href="/contribuer" className="button-quiet">
            {c.thanksAgain}
          </Link>
          <Link href="/silsila" className="button">
            {c.thanksTree}
          </Link>
        </div>
      </section>
    );
  }

  const field = (key: string) => errors[key] && <span className="contrib-error">{errors[key]}</span>;

  return (
    <section className="contrib-card">
      <ol className="contrib-steps" aria-label={c.stepOf(step + 1, steps.length)}>
        {steps.map((label, index) => (
          <li key={label} data-state={index < step ? "done" : index === step ? "current" : undefined}>
            <span className="contrib-step-dot">{index < step ? <Icon name="check" size={13} /> : index + 1}</span>
            <span className="contrib-step-label">{label}</span>
          </li>
        ))}
      </ol>

      <form
        className="contrib-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step < steps.length - 1) go(step + 1);
          else send();
        }}
      >
        <h2 className="contrib-step-title">{steps[step]}</h2>

        {/* Piège à robots : invisible pour un humain. */}
        <input
          className="contrib-trap"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />

        {kind === "mouqaddam" && step === 0 && (
          <div className="contrib-fields">
            <label className="block">
              <span className="field-label">{c.name}</span>
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder={c.namePlaceholder} autoFocus />
              {field("name")}
            </label>
            <label className="block">
              <span className="field-label">
                {c.nicknames} <small>{c.optional}</small>
              </span>
              <input className="field" value={nicknames} onChange={(event) => setNicknames(event.target.value)} placeholder={c.nicknamesPlaceholder} />
            </label>
            <PhotoField label={c.photo} value={photo} onChange={setPhoto} />
            <div className="contrib-pair">
              <fieldset>
                <legend className="field-label">
                  {c.birth} <small>{c.optional}</small>
                </legend>
                <input className="field" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} placeholder={c.datePlaceholder} aria-label={`${c.birth} : date`} />
                <input className="field" value={birthPlace} onChange={(event) => setBirthPlace(event.target.value)} placeholder={c.placePlaceholder} aria-label={`${c.birth} : lieu`} />
              </fieldset>
              <fieldset>
                <legend className="field-label">
                  {c.death} <small>{c.optional}</small>
                </legend>
                <input className="field" value={deathDate} onChange={(event) => setDeathDate(event.target.value)} placeholder="vers 2001" aria-label={`${c.death} : date`} />
                <input className="field" value={deathPlace} onChange={(event) => setDeathPlace(event.target.value)} placeholder={c.placePlaceholder} aria-label={`${c.death} : lieu`} />
              </fieldset>
            </div>
            <label className="block">
              <span className="field-label">
                {c.zawiya} <small>{c.optional}</small>
              </span>
              <input className="field" value={zawiya} onChange={(event) => setZawiya(event.target.value)} placeholder={c.zawiyaPlaceholder} />
            </label>
          </div>
        )}

        {kind === "mouqaddam" && step === 1 && (
          <div className="contrib-split">
            <div className="contrib-fields">
              {masterFree ? (
                <label className="block">
                  <span className="field-label">{c.masterName}</span>
                  <input className="field" value={masterName} onChange={(event) => setMasterName(event.target.value)} autoFocus />
                  <button
                    type="button"
                    className="contrib-link mt-2"
                    onClick={() => {
                      setMasterFree(false);
                      setMasterName("");
                    }}
                  >
                    {c.masterBack}
                  </button>
                </label>
              ) : (
                <div>
                  <span className="field-label">{c.master}</span>
                  <PersonPicker
                    name="master"
                    persons={masters}
                    defaultValue={masterId ?? ""}
                    label={c.master}
                    emptyLabel={c.masterEmpty}
                    details={details}
                    onChange={(id) => {
                      setMasterId(id || null);
                      setMasterName("");
                    }}
                  />
                  <button
                    type="button"
                    className="contrib-link mt-2"
                    onClick={() => {
                      setMasterFree(true);
                      setMasterId(null);
                    }}
                  >
                    {c.masterMissing}
                  </button>
                </div>
              )}
              {field("master")}
              <div>
                <span className="field-label">
                  {c.alsoFrom} <small>{c.optional}</small>
                </span>
                <PersonPicker
                  name="alsoFrom"
                  persons={masters.filter((candidate) => candidate.id !== masterId)}
                  defaultValue={alsoFromId ?? ""}
                  label={c.alsoFrom}
                  emptyLabel={c.alsoFromEmpty}
                  details={details}
                  onChange={(id) => setAlsoFromId(id || null)}
                />
              </div>
              <label className="block">
                <span className="field-label">
                  {c.notes} <small>{c.optional}</small>
                </span>
                <textarea className="field field-text" rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder={c.notesPlaceholder} />
              </label>
            </div>
            <ChainPreview persons={persons} masterId={masterId} masterName={masterFree ? masterName : ""} name={name} />
          </div>
        )}

        {kind !== "mouqaddam" && step === 0 && (
          <div className="contrib-fields">
            <div>
              <span className="field-label">{c.person}</span>
              <PersonPicker
                name="person"
                persons={everyone}
                defaultValue={personId ?? ""}
                label={c.person}
                emptyLabel={c.personEmpty}
                details={details}
                onChange={(id) => setPersonId(id || null)}
              />
              {field("person")}
            </div>
            {person && kind === "biography" && (
              <div className="contrib-note">
                <Avatar person={person} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block">{person.biographySlug ? c.personBio : c.personNoBio}</span>
                  {person.biographySlug && (
                    <Link href={`/biographies/${person.biographySlug}`} className="contrib-link" target="_blank">
                      {c.readBio}
                    </Link>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {kind === "biography" && step === 1 && (
          <div className="contrib-fields">
            <div className="contrib-chips" role="group" aria-label={c.text}>
              {c.sections.map((section) => (
                <button key={section} type="button" className="contrib-chip" onClick={() => insertSection(section)}>
                  <Icon name="plus" size={14} />
                  {section}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="sr-only">{c.text}</span>
              <textarea
                ref={textArea}
                className="field field-text"
                rows={12}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={c.textPlaceholder}
              />
              {field("text")}
            </label>
            <PhotoField label={c.photo} value={photo} onChange={setPhoto} />
          </div>
        )}

        {kind === "correction" && step === 1 && (
          <div className="contrib-fields">
            <div>
              <span className="field-label">{c.topics}</span>
              <Chips
                multiple
                options={c.topicList}
                value={topics}
                onToggle={(topic) =>
                  setTopics((list) => (list.includes(topic) ? list.filter((item) => item !== topic) : [...list, topic]))
                }
              />
              {field("topics")}
            </div>
            <label className="block">
              <span className="field-label">{c.correction}</span>
              <textarea className="field field-text" rows={6} value={text} onChange={(event) => setText(event.target.value)} placeholder={c.correctionPlaceholder} />
              {field("text")}
            </label>
            {topics.includes(c.topicList[4]) && <PhotoField label={c.correctionPhoto} value={photo} onChange={setPhoto} />}
          </div>
        )}

        {step === steps.length - 1 && (
          <div className="contrib-fields">
            <div>
              <span className="field-label">
                {c.sourceKind} <small>{c.optional}</small>
              </span>
              <Chips options={c.sourceKinds} value={[sourceKind]} onToggle={(option) => setSourceKind((current) => (current === option ? "" : option))} />
            </div>
            <label className="block">
              <span className="field-label">
                {c.source} <small>{c.optional}</small>
              </span>
              <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder={c.sourcePlaceholder} />
            </label>
            <fieldset className="contrib-you">
              <legend className="field-label">
                {c.you} <small>{c.optional}</small>
              </legend>
              <div className="contrib-pair">
                <input className="field" value={you} onChange={(event) => setYou(event.target.value)} placeholder={c.youName} aria-label={c.youName} autoComplete="given-name" />
                <input className="field" value={contact} onChange={(event) => setContact(event.target.value)} placeholder={c.youContact} aria-label={c.youContact} />
              </div>
              <span className="field-help block">{c.youHelp}</span>
            </fieldset>
          </div>
        )}

        {failure && (
          <p className="contrib-failure" role="alert">
            {failure}
          </p>
        )}

        <div className="contrib-actions">
          {step > 0 ? (
            <button type="button" className="button-quiet" onClick={() => go(step - 1)}>
              {c.back}
            </button>
          ) : (
            <Link href="/contribuer" className="button-quiet">
              {c.back}
            </Link>
          )}
          <button className="button" disabled={status === "sending"}>
            {step < steps.length - 1 ? c.next : status === "sending" ? c.sending : c.send}
          </button>
        </div>
      </form>
    </section>
  );
}
