"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { placeImageUrl } from "./Avatar";
import { Icon } from "./Icon";

const LONGEST = 1600;

// Garde le cadrage d'origine, réduit au plus à 1600 px et réencodé en JPEG : le fichier d'origine reste ici.
async function toJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

// Un lieu qui caractérise la personne : sa zawiya, une ville où elle a vécu… avec une légende.
export function PlaceImageField({ person }: { person?: PublicPerson }) {
  const a = t.admin;
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState("");
  const [removed, setRemoved] = useState(false);
  const [failed, setFailed] = useState(false);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFailed(false);
    try {
      setImage(await toJpeg(file));
      setRemoved(false);
    } catch {
      setFailed(true);
    }
    event.target.value = "";
  }

  const current = person?.placeImageVersion && !removed ? placeImageUrl(person) : "";
  const shown = image || current;

  return (
    <div className="place-field">
      <span className="field-label">
        {a.placeImage} <small>{a.photoOptional}</small>
      </span>
      <p className="field-help mt-0 mb-2">{a.placeImageHelp}</p>
      <input type="hidden" name="placeImage" value={image} />
      <input type="hidden" name="removePlaceImage" value={removed ? "on" : ""} />
      <input ref={input} type="file" accept="image/*" hidden onChange={choose} aria-label={a.placeImage} />

      <button
        type="button"
        className="place-stage"
        aria-label={shown ? a.placeImageReplace : a.placeImageChoose}
        onClick={() => input.current?.click()}
      >
        {shown ? (
          <Image src={shown} alt="" fill sizes="(max-width: 768px) 100vw, 40rem" unoptimized />
        ) : (
          <span className="place-empty">
            <Icon name="upload" size={22} />
            {a.placeImageChoose}
          </span>
        )}
      </button>

      {shown && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
            <Icon name="upload" size={16} />
            {a.placeImageReplace}
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-danger hover:underline"
            onClick={() => {
              setImage("");
              setRemoved(Boolean(person?.placeImageVersion));
            }}
          >
            {a.placeImageRemove}
          </button>
        </div>
      )}
      {failed && <p role="alert" className="field-help text-danger">{a.imageFailed}</p>}

      <label className="mt-3 block">
        <span className="field-label">{a.placeCaption}</span>
        <input
          name="placeCaption"
          maxLength={200}
          defaultValue={person?.placeCaption ?? ""}
          placeholder={a.placeCaptionPlaceholder}
          className="field"
        />
      </label>
    </div>
  );
}
