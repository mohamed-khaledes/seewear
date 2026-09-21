import { z } from "zod";

import type { Tables } from "@/types/database.types";

export type Review = Tables<"reviews">;

export type ReviewSummary = {
  /** Mean rating to one decimal, or null with no reviews yet. */
  average: number | null;
  count: number;
  /** The share of reviews at each star, 5 down to 1, for the bars. */
  distribution: { stars: number; count: number }[];
  reviews: Review[];
};

/** Why the form is or is not offered, so the page can say which. */
export type ReviewEligibility =
  | { kind: "signed-out" }
  | { kind: "not-delivered" }
  | { kind: "can-review" }
  | { kind: "reviewed"; review: Review };

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(80, "Keep the title under 80 characters"),
  body: z.string().trim().max(1500, "Keep it under 1,500 characters"),
});

export type ReviewValues = z.infer<typeof reviewSchema>;

export type ReviewResult = { ok: true } | { ok: false; error: string };
