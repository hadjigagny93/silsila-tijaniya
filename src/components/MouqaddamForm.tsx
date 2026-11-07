import Link from "next/link";
import { addMouqaddam, createPersonBiography, deleteBiography, deleteMouqaddam, updateMouqaddam } from "@/app/actions";
import { coverUrl, shownCover } from "@/lib/coverUrl";
import type { Biography, PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { DangerConfirm } from "./DangerConfirm";
import { EditHeader } from "./EditHeader";
import { Icon } from "./Icon";
import { ImageField } from "./ImageField";
import { NicknamesField } from "./NicknamesField";
import { Segmented } from "./Segmented";
import { MastersField } from "./AlsoFromField";
import type { Placement } from "./TransmissionField";
import { YearField } from "./YearField";

function Block({ number, title }: { number: string; title: string }) {
  return (
    <div className="form-block">
      <span>{number}</span>
      <h2>{title}</h2>
    </div>
  );
}

function PlaceRow({ kind, person }: { kind: "birth" | "death"; person?: PublicPerson }) {
  const year = kind === "birth" ? person?.birthDate : person?.deathDate;
  const city = kind === "birth" ? person?.birthCity : person?.deathCity;
  const country = kind === "birth" ? person?.birthCountry : person?.deathCountry;
  const label = kind === "birth" ? t.admin.birth : t.admin.death;
  const prefix = kind === "birth" ? "birth" : "death";

  return (
    <div className="place-row">
      <div>
        <span className="field-label">{label}</span>
        <YearField name={`${prefix}Date`} label={`${label} : ${t.admin.yearPrecision}`} defaultValue={year ?? null} />
      </div>
      <label className="block">
        <span className="field-label">{t.admin.city}</span>
        <input name={`${prefix}City`} maxLength={120} defaultValue={city ?? ""} className="field" />
      </label>
      <label className="block">
        <span className="field-label">{t.admin.country}</span>
        <input name={`${prefix}Country`} maxLength={120} defaultValue={country ?? ""} className="field" />
      </label>
    </div>
  );
}

// Une personne se pense dans cet ordre : qui elle est, sa vie, de qui elle a reçu, ce qu'on en écrit.
export function MouqaddamForm({
  person,
  parents,
  biographies,
  details,
  placements,
  covers,
  disciples = 0,
  isRoot = false,
  children,
}: {
  person?: PublicPerson;
  parents: PublicPerson[];
  biographies: Biography[];
  details: Record<string, string>;
  placements: Record<string, Placement>;
  covers: string[];
  disciples?: number;
  isRoot?: boolean;
  // Notifications affichées sous l'en-tête.
  children?: React.ReactNode;
}) {
  const biography = biographies.find((candidate) => candidate.slug === person?.biographySlug);
  const emptyBiography = Boolean(biography) && !biography?.body.trim() && !biography?.sources.length;
  const cover = biography ? shownCover(biography, covers) : null;
  const back = person ? `/admin/mouqaddams/${person.id}` : "/admin/mouqaddams";

  return (
    <form action={person ? updateMouqaddam : addMouqaddam} className="page-wide">
      {person && <input type="hidden" name="personId" value={person.id} />}
      <EditHeader
        back="/admin/mouqaddams"
        backLabel={t.nav.adminMouqaddams}
        title={person ? t.admin.editTitle : t.admin.newTitle}
        saveLabel={person ? t.admin.save : t.admin.add}
      >
        {person && (
          <Link href={`/silsila/${person.id}`} className="profile-link mt-1">
            {t.admin.viewInSilsila}
            <Icon name="arrowR" size={16} />
          </Link>
        )}
      </EditHeader>
      {children}

      <div className="edit-grid" data-photo>
        <div>
          <ImageField person={person} />
        </div>

        <div className="min-w-0">
          <Block number="01" title={t.admin.blockIdentity} />
          <div className="space-y-5">
            <label className="block">
              <span className="field-label">{t.admin.name}</span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={person?.displayName}
                className="field field-text font-display"
                style={{ fontSize: 22 }}
              />
            </label>
            <div>
              <span className="field-label">{t.admin.kind}</span>
              <Segmented
                name="kind"
                label={t.admin.kind}
                defaultValue={person?.kind ?? "mouqaddam"}
                options={[
                  { value: "cheikh", label: t.admin.kindCheikh },
                  { value: "mouqaddam", label: t.kinds.mouqaddam },
                ]}
              />
            </div>
            <div>
              <span className="field-label">{t.admin.nicknames}</span>
              <NicknamesField defaultValue={person?.nicknames} />
            </div>
          </div>

          <Block number="02" title={t.admin.blockLife} />
          <div className="space-y-4">
            <PlaceRow kind="birth" person={person} />
            <PlaceRow kind="death" person={person} />
            <label className="block">
              <span className="field-label">{t.admin.zawiya}</span>
              <input name="zawiya" maxLength={200} defaultValue={person?.zawiya ?? ""} className="field" />
            </label>
          </div>

          <Block number="03" title={t.admin.blockTransmission} />
          <MastersField
            parents={parents}
            defaultGolden={person?.mouqaddamId ?? ""}
            defaultSilver={person?.alsoFrom ?? []}
            details={details}
            placements={placements}
            personId={person?.id}
          />

          <Block number="04" title={t.admin.blockBiography} />
          {!person ? (
            <p className="field-help">{t.admin.biographyAuto}</p>
          ) : (
            <div className="space-y-4">
              {biography ? (
                <div className="linked-card">
                  <span
                    className="linked-cover"
                    style={cover ? { backgroundImage: `url("${coverUrl(cover)}")` } : undefined}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="picker-name">{biography.name}</span>
                    <span className="picker-detail">
                      {emptyBiography ? t.admin.biographyEmpty : t.admin.biographyMeta(biography.draft)}
                    </span>
                  </span>
                  <Link href={`/biographies/${biography.slug}/modifier`} className="profile-link mt-0">
                    {emptyBiography ? t.admin.biographyWrite : t.admin.biographyEdit}
                  </Link>
                </div>
              ) : (
                <div className="linked-card">
                  <span className="min-w-0 flex-1 text-muted">{t.admin.biographyNone}</span>
                  <button formAction={createPersonBiography} formNoValidate className="button">
                    <Icon name="plus" size={16} />
                    {t.admin.biographyCreate}
                  </button>
                </div>
              )}

              <label className="block">
                <span className="field-label">{t.admin.biographyChange}</span>
                <select name="biographySlug" defaultValue={person.biographySlug ?? ""} className="field">
                  {!person.biographySlug && <option value="">{t.admin.noBiography}</option>}
                  {biographies.map((candidate) => (
                    <option key={candidate.slug} value={candidate.slug}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>

              {biography && (
                <DangerConfirm
                  action={deleteBiography}
                  label={t.biographies.remove}
                  question={t.biographies.removeQuestion}
                  impact={t.biographies.removeImpact}
                  expected={biography.name}
                  fields={{ slug: biography.slug, retour: back }}
                />
              )}
            </div>
          )}

          {person && (
            <section className="panel mt-10">
              <h2 className="panel-title">{t.biographies.dangerZone}</h2>
              {isRoot ? (
                <p className="text-sm text-muted">{t.admin.rootProtected}</p>
              ) : (
                <DangerConfirm
                  action={deleteMouqaddam}
                  label={t.admin.removePerson}
                  question={t.admin.removePersonQuestion}
                  impact={
                    <>
                      <p>{t.admin.removeImpact(disciples)}</p>
                      {biography && (
                        <p>{emptyBiography ? t.admin.removeBiographyEmpty : t.admin.removeBiographyKept}</p>
                      )}
                    </>
                  }
                  expected={person.displayName}
                />
              )}
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
