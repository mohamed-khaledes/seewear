import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/features/auth/server";
import type {
  Review,
  ReviewEligibility,
  ReviewSummary,
} from "@/features/reviews/types";

const EMPTY: ReviewSummary = {
  average: null,
  count: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
  reviews: [],
};

/**
 * Every rating for a product (for the average and the bars — a few integers
 * each), and the newest twenty in full for the list.
 */
export const getReviewSummary = cache(async function getReviewSummary(
  productId: string,
): Promise<ReviewSummary> {
  if (!isSupabaseConfigured()) return EMPTY;

  const supabase = await createClient();
  const [ratings, latest] = await Promise.all([
    supabase.from("reviews").select("rating").eq("product_id", productId),
    supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Before the reviews migration is pushed the table does not exist; show no
  // reviews rather than break the product page.
  if (ratings.error || latest.error) return EMPTY;

  const all = ratings.data ?? [];
  const count = all.length;
  const total = all.reduce((sum, row) => sum + row.rating, 0);

  return {
    average: count ? Math.round((total / count) * 10) / 10 : null,
    count,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: all.filter((row) => row.rating === stars).length,
    })),
    reviews: (latest.data ?? []) as Review[],
  };
});

/**
 * Whether the signed-in customer may review this product. The database policy
 * is what enforces it; this only decides what the page offers.
 */
export async function getReviewEligibility(productId: string): Promise<ReviewEligibility> {
  const user = await getSessionUser();
  if (!user || !isSupabaseConfigured()) return { kind: "signed-out" };

  const supabase = await createClient();

  const [existing, delivered] = await Promise.all([
    supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle(),
    // user_id explicitly, not just RLS: an admin can read every order, and
    // someone else's delivery must not make an admin look eligible.
    supabase
      .from("orders")
      .select("id, order_items!inner(product_id)", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .eq("order_items.product_id", productId),
  ]);

  if (existing.data) return { kind: "reviewed", review: existing.data as Review };
  return (delivered.count ?? 0) > 0 ? { kind: "can-review" } : { kind: "not-delivered" };
}
