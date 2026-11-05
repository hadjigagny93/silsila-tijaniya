import { deleteBiography, saveBiography } from "@/app/actions";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { PersonPicker } from "@/components/PersonPicker";
import { automaticCover } from "@/lib/coverUrl";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { personDetails } from "@/lib/personDetails";
import { t } from "@/messages/fr";
import { CountedText } from "./CountedText";
import { CoverField } from "./CoverField";
import { DangerConfirm } from "./DangerConfirm";
import { EditHeader } from "./EditHeader";
import { Notice } from "./Notice";

// Colonne principale pour le contenu ; colonne de droite pour la publication.
export function BiographyForm({
  biography,
  persons,
  covers,
  personId,
  failed,
}: {
  biography?: Biography;
  persons: PublicPerson[];
  covers: string[];
  personId?: string;
  failed: boolean;
}) {
  const back = biography ? `/biographies/${biography.slug}` : "/biographies";
  const automatic = automaticCover(biography?.slug ?? "nouvelle", covers);

  return (
    <form action={saveBiography} className="page-wide">
      <input type="hidden" name="slug" value={biography?.slug ?? ""} />
      <EditHeader
        back={back}
        backLabel={biography ? biography.name : t.nav.biographies}
        title={biography ? t.biographies.editTitle : t.biographies.add}
      />
      {failed && <Notice tone="error">{t.errors.invalid}</Notice>}

      <div className="edit-grid">
        <div className="min-w-0 space-y-6">
          {automatic && <CoverField covers={covers} defaultValue={biography?.cover ?? null} automatic={automatic} />}
          <label className="block">
            <span className="field-label">{t.biographies.formName}</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={biography?.name}
              className="field field-text font-display"
              style={{ fontSize: 22 }}
            />
          </label>
          <CountedText
            name="summary"
            label={t.biographies.formSummary}
            defaultValue={biography?.summary ?? ""}
            maxLength={500}
            rows={3}
          />
          <div>
            <span className="field-label">{t.biographies.formBody}</span>
            <MarkdownEditor name="body" defaultValue={biography?.body ?? ""} />
            <p className="field-help">{t.biographies.formBodyHelp}</p>
          </div>
          <label className="block">
            <span className="field-label">{t.biographies.formSources}</span>
            <textarea
              name="sources"
              rows={5}
              maxLength={50000}
              defaultValue={biography?.sources.join("\n")}
              className="field field-text"
            />
            <span className="field-help block">{t.biographies.formSourcesHelp}</span>
          </label>
        </div>

        <aside className="edit-side space-y-4">
          <section className="panel">
            <h2 className="panel-title">{t.biographies.publication}</h2>
            <label className="check-row">
              <input type="checkbox" name="draft" defaultChecked={biography?.draft ?? true} />
              <span>
                <span className="block font-semibold">{t.biographies.draftLabel}</span>
                <span className="block text-sm text-muted">{t.biographies.formDraftHelp}</span>
              </span>
            </label>
          </section>

          <section className="panel">
            <span className="field-label">{t.biographies.formPerson}</span>
            <PersonPicker
              name="personId"
              persons={persons}
              defaultValue={personId ?? ""}
              label={t.biographies.formPerson}
              emptyLabel={t.biographies.formNoPerson}
              profileBase="/admin/mouqaddams"
              details={personDetails(persons)}
            />
          </section>

          {biography && (
            <section className="panel">
              <h2 className="panel-title">{t.biographies.dangerZone}</h2>
              <DangerConfirm
                action={deleteBiography}
                label={t.biographies.remove}
                question={t.biographies.removeQuestion}
                impact={t.biographies.removeImpact}
                expected={biography.name}
              />
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
