"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReviewAction } from "@/features/reviews/services/api/review-actions";
import { reviewSchema, type Review, type ReviewValues } from "@/features/reviews/types";
import { useT } from "@/lib/i18n";

/** One label per star, keyed so both languages describe the same five. */
const LABEL_KEYS = [
  null,
  "reviews.star1",
  "reviews.star2",
  "reviews.star3",
  "reviews.star4",
  "reviews.star5",
] as const;

export function ReviewForm({
  productId,
  productSlug,
  existing,
}: {
  productId: string;
  productSlug: string;
  existing?: Review;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(0);

  /** Star count to words. Zero has none, which is why the list starts null. */
  const starLabel = (stars: number) => {
    const key = LABEL_KEYS[stars];
    return key ? t(key) : "";
  };

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId,
      rating: existing?.rating ?? 0,
      title: existing?.title ?? "",
      body: existing?.body ?? "",
    },
  });

  const rating = useWatch({ control: form.control, name: "rating" });
  const shown = hover || rating;

  function onSubmit(values: ReviewValues) {
    startTransition(async () => {
      const result = await submitReviewAction(values, productSlug);
      if (result.ok) {
        toast.success(existing ? t("reviews.updated") : t("reviews.published"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">{t("reviews.rating")}</FormLabel>
              <FormControl>
                <div
                  role="radiogroup"
                  aria-label="Rating"
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === value}
                      aria-label={`${value} — ${starLabel(value)}`}
                      onMouseEnter={() => setHover(value)}
                      onClick={() => field.onChange(value)}
                      className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-ink"
                    >
                      <Star
                        className={cn(
                          "size-6 transition-colors",
                          value <= shown ? "fill-ink text-ink" : "text-line",
                        )}
                        strokeWidth={1.4}
                      />
                    </button>
                  ))}
                  <span className="ms-2 text-xs text-grey-2">{starLabel(shown)}</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">{t("reviews.headline")}</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder={t("reviews.star4")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">{t("reviews.body")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("reviews.bodyPlaceholder")}
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm h-12 w-full font-semibold sm:w-fit sm:px-10"
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {existing ? t("reviews.update") : t("reviews.publish")}
        </Button>
      </form>
    </Form>
  );
}
