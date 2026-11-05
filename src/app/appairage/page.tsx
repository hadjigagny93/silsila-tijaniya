import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Notice } from "@/components/Notice";
import { sqliteStore } from "@/lib/data/sqlite";
import { lanAddress, pairingLink, pairToken, renewPairToken } from "@/lib/pairing";
import { t } from "@/messages/fr";

export const metadata: Metadata = { title: t.pairing.title };
export const dynamic = "force-dynamic";

async function renew() {
  "use server";
  await renewPairToken(await sqliteStore.driver());
  redirect("/appairage?ok=1");
}

// Le QR code d'appairage : l'appareil photo de l'iPhone l'ouvre dans l'app, qui garde l'adresse et le jeton.
export default async function PairingPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  if (!process.env.SQLITE_PATH) {
    return (
      <div className="max-w-3xl">
        <h1 className="page-title">{t.pairing.title}</h1>
        <p className="page-intro">{t.pairing.desktopOnly}</p>
      </div>
    );
  }
  const { ok } = await searchParams;
  const link = pairingLink(await pairToken(await sqliteStore.driver()));
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const { host, addresses } = lanAddress();

  return (
    <div className="max-w-3xl">
      <h1 className="page-title">{t.pairing.title}</h1>
      <p className="page-intro">{t.pairing.intro}</p>
      {ok && <Notice tone="success">{t.pairing.renewed}</Notice>}

      <section className="panel pairing-panel mt-6">
        <div className="pairing-code" role="img" aria-label={t.pairing.title} dangerouslySetInnerHTML={{ __html: svg }} />
        <div>
          <ol className="pairing-steps">
            {t.pairing.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            {t.pairing.address(addresses[0] ? `${host} · ${addresses[0]}` : host)}
          </p>
          <p className="mt-1 text-sm text-muted">{t.pairing.keepOpen}</p>
        </div>
      </section>

      <form action={renew} className="mt-6">
        <button className="button-quiet">{t.pairing.renew}</button>
        <p className="mt-2 text-sm text-muted">{t.pairing.renewHint}</p>
      </form>
    </div>
  );
}
