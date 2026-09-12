import "server-only";

import { getSessionUser } from "@/features/auth/server";
import { DEMO_BLOCKED_MESSAGE } from "@/config/constants";

export type GuardFailure = { ok: false; error: string };

/**
 * Every mutating dashboard action runs through this. It mirrors the
 * `can_manage_store()` policy in the database — the client-side toast is a
 * courtesy, this and RLS are the enforcement.
 */
export async function assertCanManageStore(): Promise<GuardFailure | null> {
  const user = await getSessionUser();

  if (!user) return { ok: false, error: "You need to be signed in." };
  if (user.role !== "admin") return { ok: false, error: "Admins only." };
  if (user.isDemo) return { ok: false, error: DEMO_BLOCKED_MESSAGE };

  return null;
}
