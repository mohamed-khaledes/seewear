import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SessionUser } from "@/features/auth/types";

/**
 * The signed-in user plus their profile, memoised for the render pass so a
 * layout and its pages do not each pay for the round trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_demo, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      profile?.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
    avatarUrl:
      profile?.avatar_url ??
      (user.user_metadata?.avatar_url as string | undefined) ??
      null,
    role: profile?.role ?? "user",
    isDemo: profile?.is_demo ?? false,
  };
});

/** Throws past the middleware gate for pages that must have a user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Not authorised");
  return user;
}
