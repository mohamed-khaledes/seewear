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

const LABELS = ["", "Not for me", "Disappointing", "Fine", "Good", "Excellent"];

export function ReviewForm({
  productId,
  productSlug,
  existing,
}: {
  productId: string;
  productSlug: string;
  existing?: Review;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(0);

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
        toast.success(existing ? "Review updated" : "Thanks — your review is live");
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
              <FormLabel className="up-xs text-grey-2">Your rating</FormLabel>
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
                      aria-label={`${value} — ${LABELS[value]}`}
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
                  <span className="ml-2 text-xs text-grey-2">{LABELS[shown]}</span>
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
              <FormLabel className="up-xs text-grey-2">Headline (optional)</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="Runs true to size" {...field} />
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
              <FormLabel className="up-xs text-grey-2">What you thought (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Fit, fabric, how it wears after a few washes."
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
          {existing ? "Update review" : "Publish review"}
        </Button>
      </form>
    </Form>
  );
}
