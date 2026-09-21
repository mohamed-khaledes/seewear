import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

/**
 * The limits in one place, so they can be read and tuned together. Each is a
 * count per fixed window, keyed by whatever makes abuse expensive: the caller's
 * address, and for order tracking the order number too — otherwise one known
 * order number could be tried against a thousand guessed emails from a
 * thousand addresses.
 */
export const LIMITS = {
  checkout: { max: 10, windowSeconds: 600 },
  discountPreview: { max: 20, windowSeconds: 600 },
  trackByIp: { max: 10, windowSeconds: 600 },
  trackByOrder: { max: 6, windowSeconds: 3600 },
  contact: { max: 5, windowSeconds: 3600 },
  passwordReset: { max: 5, windowSeconds: 3600 },
  stockAlert: { max: 10, windowSeconds: 3600 },
  review: { max: 10, windowSeconds: 3600 },
  clientError: { max: 20, windowSeconds: 600 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** Best effort: Vercel sets x-forwarded-for, and its first entry is the client. */
export async function clientAddress(): Promise<string> {
  const list = await headers();
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one hit and says whether it is allowed.
 *
 * Fails open. A limiter that can take checkout down when the database hiccups
 * is worse than a limiter that briefly lets extra requests through, and every
 * failure is logged so it does not stay invisible.
 */
export async function allow(name: LimitName, subject: string): Promise<boolean> {
  if (!isServiceRoleConfigured()) return true;

  const { max, windowSeconds } = LIMITS[name];

  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: `${name}:${subject}`,
      p_window_seconds: windowSeconds,
      p_max: max,
    });

    if (error) {
      console.error(`[rate-limit] ${name} check failed, allowing`, error.message);
      return true;
    }

    return data === true;
  } catch (error) {
    console.error(`[rate-limit] ${name} check threw, allowing`, error);
    return true;
  }
}

/** The usual case: one limit, keyed by the caller's address. */
export async function allowByAddress(name: LimitName): Promise<boolean> {
  return allow(name, await clientAddress());
}

export const RATE_LIMITED_MESSAGE =
  "That is a lot of attempts in a short time. Wait a few minutes and try again.";
