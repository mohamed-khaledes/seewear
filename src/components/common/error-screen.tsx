"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/**
 * The shared face of every error boundary. Reports once per error to
 * /api/errors, so a broken page reaches the alert channel even when the
 * failure happened in the browser rather than on the server.
 */
export function ErrorScreen({
  error,
  reset,
  scope,
  homeHref = "/",
  homeLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  scope: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  const t = useT();

  useEffect(() => {
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[${scope}] ${error.message}`.slice(0, 500),
        digest: error.digest ?? null,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error, scope]);

  return (
    <div className="grid min-h-[60dvh] place-items-center bg-concrete px-6 py-24 text-center">
      <div>
        <p className="up-xs text-grey-2">{t("errors.somethingBroke")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t("errors.didNotLoad")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-grey-2">
          {t("errors.reported")}
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-grey">ref {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} size="lg" className="up-sm h-12 px-8 font-semibold">
            {t("common.tryAgain")}
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-12 px-8 font-semibold">
            <Link href={homeHref}>{homeLabel ?? t("errors.home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
