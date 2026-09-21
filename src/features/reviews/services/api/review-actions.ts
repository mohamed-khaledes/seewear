"use server";

import { revalidatePath } from "next/cache";

import { allow, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/server";
import { reviewSchema, type ReviewResult, type ReviewValues } from "@/features/reviews/types";

/** "Ahmed M." — enough to feel like a person, not enough to find one. */
function publicName(fullName: string | null, email: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return (email ?? "Customer").split("@")[0].slice(0, 20);
  const initial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return `${parts[0]}${initial}`.slice(0, 60);
}

/**
 * Publishes a review. The database policy only accepts it from someone with a
 * delivered order containing this product, so a refusal here means exactly
 * that — it is not a check this code could forget to make.
 */
export async function submitReviewAction(
  values: ReviewValues,
  productSlug: string,
): Promise<ReviewResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to review." };

  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review." };
  }

  if (!(await allow("review", user.id))) return { ok: false, error: RATE_LIMITED_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").upsert(
    {
      product_id: parsed.data.productId,
      user_id: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
      author_name: publicName(user.fullName, user.email),
    },
    { onConflict: "product_id,user_id" },
  );

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42501"
          ? "Reviews open once your order with this piece has been delivered."
          : "We could not publish that review.",
    };
  }

  revalidatePath(`/product/${productSlug}`);
  return { ok: true };
}

/** An author removing their own review, or an admin removing anyone's. */
export async function deleteReviewAction(
  reviewId: string,
  productSlug: string,
): Promise<ReviewResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select("id");

  if (error || !data?.length) {
    return { ok: false, error: "That review could not be removed." };
  }

  revalidatePath(`/product/${productSlug}`);
  return { ok: true };
}
