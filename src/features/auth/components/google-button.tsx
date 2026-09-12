"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/features/auth/services/api/auth-actions";

export function GoogleButton({ next, label }: { next?: string; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full justify-center"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signInWithGoogleAction(next);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      <GoogleMark />
      {label}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.79Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.96H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.26 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.3a12 12 0 0 0 0 10.74l3.96-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.3 6.63l3.96 3.1C6.21 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
