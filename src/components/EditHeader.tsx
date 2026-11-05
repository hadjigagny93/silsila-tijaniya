import Link from "next/link";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// En-tête des pages d'édition : retour, titre, puis Annuler et Enregistrer.
export function EditHeader({
  back,
  backLabel,
  title,
  cancel,
  saveLabel = t.admin.save,
  children,
}: {
  back: string;
  backLabel: string;
  title: string;
  cancel?: string;
  saveLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="edit-header">
      <div className="min-w-0">
        <Link href={back} className="back-link">
          <Icon name="arrowL" size={16} />
          {backLabel}
        </Link>
        <h1 className="mt-1">{title}</h1>
        {children}
      </div>
      <div className="edit-actions">
        <Link href={cancel ?? back} className="button-quiet">
          {t.admin.cancel}
        </Link>
        <button className="button">{saveLabel}</button>
      </div>
    </header>
  );
}
