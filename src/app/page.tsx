import Link from "next/link";
import { t } from "@/messages/fr";

export default function Home() {
  return (
    <>
      <h1 className="max-w-2xl text-4xl leading-tight sm:text-5xl">{t.home.title}</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">{t.home.intro}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/silsila" className="rounded-lg border border-line bg-surface p-6 hover:border-accent">
          <h2 className="text-2xl text-accent">{t.home.silsilaTitle}</h2>
          <p className="mt-2 text-muted">{t.home.silsilaText}</p>
        </Link>
        <Link href="/biographies" className="rounded-lg border border-line bg-surface p-6 hover:border-accent">
          <h2 className="text-2xl text-accent">{t.home.biographiesTitle}</h2>
          <p className="mt-2 text-muted">{t.home.biographiesText}</p>
        </Link>
      </div>
    </>
  );
}
