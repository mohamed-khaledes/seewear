"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[seewear] unhandled error", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-concrete px-6 py-24 text-center">
      <div>
        <p className="up-xs text-grey-2">Something broke</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          That did not load
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-grey-2">
          The page hit an error on its way to you. Try again — if it keeps happening,
          the store logs will have the detail.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-grey">ref {error.digest}</p>
        ) : null}
        <Button
          onClick={reset}
          size="lg"
          className="up-sm mt-8 h-12 px-8 font-semibold"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
