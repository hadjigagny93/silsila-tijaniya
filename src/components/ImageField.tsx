"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const SIZE = 400;
const PREVIEW = 220;

// Recadre en carré et réencode en JPEG : aucun fichier d'origine n'atteint le serveur.
async function toSquareJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ImageField({ person }: { person?: PublicPerson }) {
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState("");
  const [removed, setRemoved] = useState(false);
  const [failed, setFailed] = useState(false);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFailed(false);
    try {
      setImage(await toSquareJpeg(file));
      setRemoved(false);
    } catch {
      setFailed(true);
    }
    event.target.value = "";
  }

  const hasCurrent = Boolean(person?.hasImage) && !removed;

  return (
    <div>
      <span className="field-label">
        {t.admin.image} <small>{t.admin.photoOptional}</small>
      </span>
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="removeImage" value={removed ? "on" : ""} />
      <input ref={input} type="file" accept="image/*" hidden onChange={choose} aria-label={t.admin.image} />

      {/* Le recadrage se fait dans un cercle : le format final de l'avatar. */}
      <button
        type="button"
        className="photo-stage"
        aria-label={t.admin.imageChoose}
        onClick={() => input.current?.click()}
      >
        {image ? (
          <Image className="avatar" src={image} alt="" width={PREVIEW} height={PREVIEW} unoptimized />
        ) : person && !removed && person.hasImage ? (
          <Avatar person={person} size={PREVIEW} />
        ) : (
          <span className="photo-empty">
            <Icon name="upload" size={22} />
            {t.admin.imageChoose}
          </span>
        )}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="button-quiet" onClick={() => input.current?.click()}>
          <Icon name="upload" size={16} />
          {image || hasCurrent ? t.admin.imageReplace : t.admin.imageChoose}
        </button>
        {(image || hasCurrent) && (
          <button
            type="button"
            className="text-sm font-semibold text-danger hover:underline"
            onClick={() => {
              setImage("");
              setRemoved(Boolean(person?.hasImage));
            }}
          >
            {t.admin.imageRemove}
          </button>
        )}
      </div>
      {failed && <p role="alert" className="field-help text-danger">{t.admin.imageFailed}</p>}
    </div>
  );
}
