import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { notifyBackInStock } from "@/lib/stock-alerts";
import { reconcilePendingOrders } from "@/features/checkout/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The scheduled sweep: settle card orders whose Paymob callback never came,
 * rescue expired ones that turn out to have been paid, give back the stock of
 * checkouts nobody finished.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Anything
 * else — Supabase pg_cron, a GitHub Action, an uptime pinger — can call it the
 * same way. Without a secret configured the route refuses everyone, so it can
 * never run by accident on a deployment that has not set one.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const report = await reconcilePendingOrders(createAdminClient());
  // Expired checkouts just gave stock back; tell anyone waiting for it.
  const alertsSent = await notifyBackInStock();

  console.log("[cron] reconcile", JSON.stringify({ ...report, alertsSent }));
  return NextResponse.json({ ok: true, report, alertsSent });
}
