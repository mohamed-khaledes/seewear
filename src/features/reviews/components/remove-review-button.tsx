"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteReviewAction } from "@/features/reviews/services/api/review-actions";

export function RemoveReviewButton({
  reviewId,
  productSlug,
}: {
  reviewId: string;
  productSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteReviewAction(reviewId, productSlug);
          if (result.ok) {
            toast.success("Review removed");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
      className="underline-offset-4 hover:text-sale hover:underline"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
