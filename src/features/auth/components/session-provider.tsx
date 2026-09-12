"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SessionUser } from "@/features/auth/types";

const SessionContext = createContext<SessionUser | null>(null);

/**
 * Hands the server-resolved session to client components so a heart button or
 * a cart merge does not have to ask Supabase who the user is.
 */
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser | null {
  return useContext(SessionContext);
}
