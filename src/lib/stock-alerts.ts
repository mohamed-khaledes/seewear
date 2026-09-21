import "server-only";

import { siteConfig } from "@/config/site";
import { sendBackInStockNotice } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

type WaitingAlert = {
  id: string;
  email: string;
  variant: {
    color: string | null;
    size: string | null;
    stock: number;
    product: { name: string; slug: string; status: string } | null;
  } | null;
};

/**
 * Emails everyone waiting on a variant that has stock again, then marks them
 * told so nobody hears twice.
 *
 * Called after anything that can raise stock — a product saved in the
 * dashboard, a cancellation or restock giving pieces back — and by the daily
 * job as a backstop. It looks at stock as it is now rather than at what the
 * caller changed, so calling it too often is harmless.
 */
export async function notifyBackInStock(variantIds?: string[]): Promise<number> {
  if (!isServiceRoleConfigured()) return 0;

  const admin = createAdminClient();
  let query = admin
    .from("stock_alerts")
    .select(
      "id, email, variant:product_variants(color, size, stock, product:products(name, slug, status))",
    )
    .is("notified_at", null)
    .limit(500);

  if (variantIds?.length) query = query.in("variant_id", variantIds);

  const { data, error } = await query.returns<WaitingAlert[]>();
  if (error) {
    // Missing table before the migration is pushed: nothing to send.
    console.error("[stock-alerts] could not read alerts", error.message);
    return 0;
  }

  const ready = (data ?? []).filter(
    (alert) =>
      alert.variant &&
      alert.variant.stock > 0 &&
      alert.variant.product?.status === "active",
  );

  let sent = 0;
  for (const alert of ready) {
    const variant = alert.variant!;
    const delivered = await sendBackInStockNotice({
      email: alert.email,
      productName: variant.product!.name,
      variantLabel: [variant.color, variant.size].filter(Boolean).join(" · "),
      productUrl: `${siteConfig.url}/product/${variant.product!.slug}`,
    });

    // Only mark it when the email actually went, so a Resend outage retries
    // on the next call instead of silently dropping the promise.
    if (delivered) {
      await admin
        .from("stock_alerts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", alert.id);
      sent += 1;
    }
  }

  return sent;
}
