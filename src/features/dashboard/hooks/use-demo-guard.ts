"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { DEMO_BLOCKED_MESSAGE } from "@/config/constants";
import { useSessionUser } from "@/features/auth/components/session-provider";

/**
 * Stops a demo session before it fires a mutation, and says why. The server
 * action and RLS both refuse anyway — this just makes the refusal friendly.
 */
export function useDemoGuard() {
  const user = useSessionUser();
  const isDemo = user?.isDemo ?? false;

  const guard = useCallback(
    (action: () => void) => {
      if (isDemo) {
        toast(DEMO_BLOCKED_MESSAGE, {
          description: "Browse everything you like — the store data stays as it is.",
        });
        return;
      }
      action();
    },
    [isDemo],
  );

  return { isDemo, guard };
}
