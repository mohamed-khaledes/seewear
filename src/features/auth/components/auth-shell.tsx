import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";
import { getT } from "@/lib/i18n/server";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer: ReactNode;
};

const HERO = "/hero/hero-lineup.webp";

/**
 * Split screen: the campaign shot on the left, the form on paper at right.
 * Below lg the panel would squeeze the form off-screen, so the photograph
 * becomes a band above it instead of disappearing entirely.
 */
export async function AuthShell({ eyebrow, title, children, footer }: AuthShellProps) {
  const t = await getT();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_minmax(0,520px)]">
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:block">
        <Image
          src={HERO}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-[50%_30%]"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(200deg,rgba(5,5,5,0.55)_0%,rgba(5,5,5,0.35)_40%,rgba(5,5,5,0.9)_100%)]"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="up text-lg font-bold tracking-[0.34em]">
            {siteConfig.name}
          </Link>
          <div className="max-w-sm">
            <p className="up-xs text-white/70">{t("auth.members")}</p>
            <p className="mt-3 text-3xl font-bold leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
              {t("auth.membersLine")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {t("auth.keepTogether")}
            </p>
          </div>
        </div>
      </aside>

      <div className="relative h-44 overflow-hidden bg-ink sm:h-56 lg:hidden">
        <Image
          src={HERO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_28%]"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.35)_60%,rgba(5,5,5,0.25)_100%)]"
          aria-hidden="true"
        />
        <Link
          href="/"
          className="up absolute bottom-5 start-6 text-base font-bold tracking-[0.32em] text-white"
        >
          {siteConfig.name}
        </Link>
      </div>

      <main className="flex flex-col justify-center bg-paper px-6 py-10 sm:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-sm">
          <p className="up-xs text-grey-2">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-sm text-grey-2">{footer}</div>
        </div>
      </main>
    </div>
  );
}
