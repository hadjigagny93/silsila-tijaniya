import Link from "next/link";
import { t } from "@/messages/fr";

export default function Home() {
  return (
    <>
      <h1 className="site-title text-center">{t.home.title}</h1>
      <p className="mx-auto mt-3 max-w-[680px] text-center text-muted">{t.home.intro}</p>

      <div className="pattern-band mt-8" aria-hidden />

      <div className="card-grid mt-10">
        <Link href="/silsila" className="group block">
          <p className="label">{t.home.silsilaLabel}</p>
          <h2 className="mt-2 group-hover:text-accent">{t.home.silsilaTitle}</h2>
          <p className="mt-2 text-muted">{t.home.silsilaText}</p>
        </Link>
        <Link href="/biographies" className="group block">
          <p className="label">{t.home.biographiesLabel}</p>
          <h2 className="mt-2 group-hover:text-accent">{t.home.biographiesTitle}</h2>
          <p className="mt-2 text-muted">{t.home.biographiesText}</p>
        </Link>
      </div>
    </>
  );
}
