import Link from "next/link";

import { formatDate } from "@/lib/utils";
import { getSessionUser } from "@/features/auth/server";
import { Stars } from "@/features/reviews/components/stars";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { RemoveReviewButton } from "@/features/reviews/components/remove-review-button";
import {
  getReviewEligibility,
  getReviewSummary,
} from "@/features/reviews/services/api/reviews.server";
import { getT } from "@/lib/i18n/server";

/**
 * Reviews from people who received the piece. "Verified" is not a badge this
 * page awards: the database refuses a review from anyone without a delivered
 * order for the product, so every review here is one.
 */
export async function ProductReviews({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const [summary, eligibility, user, t] = await Promise.all([
    getReviewSummary(productId),
    getReviewEligibility(productId),
    getSessionUser(),
    getT(),
  ]);

  const isAdmin = user?.role === "admin";

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="scroll-mt-24 border-t border-line bg-paper px-5 py-12 lg:px-6"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[300px_1fr]">
        <div>
          <p className="up-xs text-grey-2">{t("reviews.reviews")}</p>
          <h2 id="reviews-heading" className="mt-2 text-2xl font-bold tracking-tight">
            {summary.count === 0 ? t("reviews.none") : t("reviews.whatBuyersSay")}
          </h2>

          {summary.average !== null ? (
            <div className="mt-5">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums">
                  {summary.average.toFixed(1)}
                </span>
                <Stars rating={summary.average} size="size-4" />
              </div>
              <p className="mt-1 text-xs text-grey-2">
                From {summary.count} {summary.count === 1 ? "buyer" : "buyers"}
              </p>

              <ul className="mt-5 grid gap-1.5">
                {summary.distribution.map((row) => (
                  <li key={row.stars} className="flex items-center gap-2.5 text-xs">
                    <span className="w-3 tabular-nums text-grey-2">{row.stars}</span>
                    <span className="h-1.5 flex-1 bg-concrete">
                      <span
                        className="block h-full bg-ink"
                        style={{ width: `${(row.count / summary.count) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-end tabular-nums text-grey">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-grey-2">
              {t("reviews.onlyDelivered")}
            </p>
          )}
        </div>

        <div className="grid gap-8">
          {eligibility.kind === "can-review" || eligibility.kind === "reviewed" ? (
            <div className="border border-line bg-concrete p-5 sm:p-6">
              <p className="up-xs mb-4 text-grey-2">
                {eligibility.kind === "reviewed"
                  ? t("reviews.yourReview")
                  : t("reviews.youBoughtThis")}
              </p>
              <ReviewForm
                productId={productId}
                productSlug={productSlug}
                existing={eligibility.kind === "reviewed" ? eligibility.review : undefined}
              />
            </div>
          ) : eligibility.kind === "signed-out" ? (
            <p className="text-sm text-grey-2">
              Bought this?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(`/product/${productSlug}#reviews`)}`}
                className="font-medium text-ink underline underline-offset-4"
              >
                {t("reviews.signIn")}
              </Link>{" "}
              to review it once it has been delivered.
            </p>
          ) : null}

          {summary.reviews.length > 0 ? (
            <ul className="divide-y divide-line border-y border-line">
              {summary.reviews.map((review) => (
                <li key={review.id} className="grid gap-2 py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} />
                    {review.title ? (
                      <p className="text-sm font-semibold">{review.title}</p>
                    ) : null}
                  </div>
                  {review.body ? (
                    <p className="max-w-[68ch] text-sm leading-relaxed text-grey-2">
                      {review.body}
                    </p>
                  ) : null}
                  <p className="up-xs flex items-center gap-3 text-grey">
                    <span>
                      {review.author_name} · {formatDate(review.created_at)}
                    </span>
                    {isAdmin || review.user_id === user?.id ? (
                      <RemoveReviewButton reviewId={review.id} productSlug={productSlug} />
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
