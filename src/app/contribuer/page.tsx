import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CONTRIBUTION_KINDS, CONTRIBUTION_PATHS } from "@/lib/contributions";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.contribute.eyebrow };

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ personne?: string }> }) {
  const { personne } = await searchParams;
  const c = t.contribute;
  const query = personne ? `?personne=${encodeURIComponent(personne)}` : "";

  return (
    <div className="contrib-page">
      <header className="contrib-head">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <p className="contrib-lead">{c.lead}</p>
      </header>
      <ul className="contrib-doors">
        {CONTRIBUTION_KINDS.map((kind) => (
          <li key={kind}>
            <Link href={`/contribuer/${CONTRIBUTION_PATHS[kind]}${kind === "mouqaddam" ? "" : query}`} className="contrib-door">
              <span className="contrib-door-icon" aria-hidden>
                <Icon name={c.kinds[kind].icon as "users"} size={24} />
              </span>
              <span className="contrib-door-title">{c.kinds[kind].title}</span>
              <span className="contrib-door-text">{c.kinds[kind].text}</span>
              <span className="contrib-door-go" aria-hidden>
                <Icon name="chevron" size={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="contrib-reviewed">
        <Icon name="shield" size={16} />
        {c.reviewed}
      </p>
    </div>
  );
}
