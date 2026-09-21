"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Only shown when the root layout itself fails, so it cannot lean on anything
 * the layout provides. Plain markup, the stylesheet, and one report home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[global] ${error.message}`.slice(0, 500),
        digest: error.digest ?? null,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-concrete px-6 text-center">
        <div>
          <p className="up-xs text-grey-2">SEEWEAR</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">The shop is having a moment</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-grey-2">
            Something failed before the page could load. It has been reported. Try again
            in a few seconds.
          </p>
          <button
            type="button"
            onClick={reset}
            className="up-sm mt-8 h-12 bg-ink px-8 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
