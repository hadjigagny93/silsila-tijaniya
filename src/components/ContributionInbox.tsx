"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Contribution } from "@/lib/contributions";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const b = t.inbox;
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

type Tab = "new" | "done" | "rejected";
const TABS: Tab[] = ["new", "done", "rejected"];
const QUERY: Record<Tab, string> = { new: "", done: "?statut=traitees", rejected: "?statut=refusees" };

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; items: Contribution[]; pending: number };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inbox-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Relecture des contributions du site (app Mac) : on lit Supabase par une route du serveur local, qui applique
// aussi les acceptations à la base du Mac. Sur l'iPhone, la route n'existe pas : la page le dit.
export function ContributionInbox({ persons }: { persons: PublicPerson[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("new");
  const [state, setState] = useState<State>({ phase: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const byId = new Map(persons.map((person) => [person.id, person]));

  const load = useCallback(async (which: Tab) => {
    try {
      const response = await fetch(`/api/contributions-recues${QUERY[which]}`, { cache: "no-store" });
      if (response.status === 404) return setState({ phase: "error", message: b.unavailable });
      const body = await response.json();
      if (body.error === "missing-key") return setState({ phase: "error", message: b.missingKey });
      if (!response.ok) throw new Error(body.error);
      setState({ phase: "ready", items: body.items, pending: body.pending });
    } catch {
      setState({ phase: "error", message: b.error });
    }
  }, []);

  useEffect(() => {
    // Lecture à l'ouverture et à chaque changement d'onglet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(tab);
  }, [load, tab]);

  async function act(item: Contribution, action: "accept" | "reject" | "done") {
    setBusy(`${item.id}:${action}`);
    try {
      const response = await fetch("/api/contributions-recues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.href) return router.push(body.href);
      await load(tab);
    } catch {
      setState({ phase: "error", message: b.error });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="inbox-tabs" role="tablist">
        {TABS.map((which) => (
          <button
            key={which}
            role="tab"
            aria-selected={tab === which}
            onClick={() => {
              setState({ phase: "loading" });
              setTab(which);
            }}
          >
            {b.tabs[which]}
            {which === "new" && state.phase === "ready" && state.pending > 0 && (
              <span className="count-badge">{state.pending}</span>
            )}
          </button>
        ))}
      </div>

      {state.phase === "loading" && <p className="mt-6 text-muted">…</p>}
      {state.phase === "error" && <p className="mt-6 text-muted">{state.message}</p>}
      {state.phase === "ready" && state.items.length === 0 && (
        <p className="inbox-empty">{tab === "new" ? b.empty : tab === "done" ? b.emptyDone : b.emptyRejected}</p>
      )}

      {state.phase === "ready" && (
        <ul className="inbox-list">
          {state.items.map((item) => {
            const data = item.payload;
            const person = item.personId ? byId.get(item.personId) : undefined;
            const master = data.masterId ? byId.get(data.masterId) : undefined;
            const also = data.alsoFromId ? byId.get(data.alsoFromId) : undefined;
            const working = (action: string) => busy === `${item.id}:${action}`;
            return (
              <li key={item.id} className="inbox-item" data-kind={item.kind}>
                <header className="inbox-head">
                  <span className="inbox-kind">{b.kinds[item.kind]}</span>
                  <span className="text-muted">{b.from(item.contributorName, dateLabel(item.createdAt))}</span>
                  {item.status !== "new" && <span className="inbox-status">{b.status[item.status]}</span>}
                </header>

                <div className="inbox-body">
                  {item.photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- photo envoyée, pas encore dans la base
                    <img className="inbox-photo" src={`data:image/jpeg;base64,${item.photo}`} alt="" />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.kind === "mouqaddam" ? (
                      <h2 className="inbox-title">{data.name}</h2>
                    ) : person ? (
                      <h2 className="inbox-title flex items-center gap-3">
                        <Avatar person={person} size={36} />
                        {person.displayName}
                      </h2>
                    ) : (
                      <h2 className="inbox-title text-muted">{b.personGone}</h2>
                    )}
                    <dl className="inbox-facts">
                      {item.kind === "mouqaddam" && (
                        <>
                          {master ? (
                            <Row label={b.master}>{master.displayName}</Row>
                          ) : (
                            data.masterName && <Row label={b.masterOutside}>{data.masterName}</Row>
                          )}
                          {also && <Row label={b.alsoFrom}>{also.displayName}</Row>}
                          {data.nicknames && <Row label={b.nicknames}>{data.nicknames}</Row>}
                          {(data.birthDate || data.birthPlace) && (
                            <Row label={b.birth}>{[data.birthDate, data.birthPlace].filter(Boolean).join(" · ")}</Row>
                          )}
                          {(data.deathDate || data.deathPlace) && (
                            <Row label={b.death}>{[data.deathDate, data.deathPlace].filter(Boolean).join(" · ")}</Row>
                          )}
                          {data.zawiya && <Row label={b.zawiya}>{data.zawiya}</Row>}
                        </>
                      )}
                      {item.kind === "correction" && data.topics?.length ? (
                        <Row label={b.topics}>{data.topics.join(", ")}</Row>
                      ) : null}
                      {(data.sourceKind || data.source) && (
                        <Row label={b.source}>{[data.sourceKind, data.source].filter(Boolean).join(" : ")}</Row>
                      )}
                      {item.contributorContact && <Row label={b.contact}>{item.contributorContact}</Row>}
                    </dl>
                    {(data.notes || data.text) && <p className="inbox-text">{data.notes || data.text}</p>}
                  </div>
                </div>

                {(item.status === "new" || item.status === "rejected") && (
                  <footer className="inbox-actions">
                    {item.status === "rejected" && <span className="inbox-again">{b.acceptAnyway}</span>}
                    {item.kind === "correction" ? (
                      <>
                        {person && (
                          <Link href={`/admin/mouqaddams/${person.id}`} className="button-quiet" target="_blank">
                            {b.openPerson}
                          </Link>
                        )}
                        <button className="button" disabled={Boolean(busy)} onClick={() => act(item, "done")}>
                          <Icon name="check" size={16} />
                          {working("done") ? b.busy : b.markDone}
                        </button>
                      </>
                    ) : (
                      <button
                        className="button"
                        disabled={Boolean(busy) || (item.kind !== "mouqaddam" && !person)}
                        onClick={() => act(item, "accept")}
                      >
                        <Icon name={item.kind === "mouqaddam" ? "plus" : "book"} size={16} />
                        {working("accept") ? b.busy : item.kind === "mouqaddam" ? b.acceptMouqaddam : b.acceptBiography}
                      </button>
                    )}
                    {item.status === "new" && (
                      <button className="button-quiet inbox-reject" disabled={Boolean(busy)} onClick={() => act(item, "reject")}>
                        {working("reject") ? b.busy : b.reject}
                      </button>
                    )}
                  </footer>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
